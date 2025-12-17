import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Upload, Film, Eraser, Brush, Save, Undo2, Download, Trash2, Sparkles, Zap, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { FrameTimeline, Frame } from './FrameTimeline';

type InpaintingModelType = 'fast' | 'quality' | 'premium';

interface ModelOption {
    key: InpaintingModelType;
    name: string;
    description: string;
    icon: React.ReactNode;
}

const MODEL_OPTIONS: ModelOption[] = [
    { key: 'fast', name: 'Fast', description: 'Quick, basic quality', icon: <Zap className="w-3 h-3" /> },
    { key: 'quality', name: 'Quality', description: 'Better context', icon: <Sparkles className="w-3 h-3" /> },
    { key: 'premium', name: 'Premium', description: 'Best textures', icon: <Crown className="w-3 h-3" /> }
];

interface RotoscopePanelProps {
    initialVideoUrl?: string;
}

interface RotoscopeSession {
    sessionId: string;
    frames: Frame[];
    fps: number;
    duration: number;
    totalFrames: number;
}

export function RotoscopePanel({ initialVideoUrl }: RotoscopePanelProps) {
    // Session state
    const [session, setSession] = useState<RotoscopeSession | null>(null);
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
    const [isExtracting, setIsExtracting] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [editedFrames, setEditedFrames] = useState<Set<number>>(new Set());
    const [isReconstructing, setIsReconstructing] = useState(false);

    // Drawing state
    const [brushSize, setBrushSize] = useState(30);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFrameLoading, setIsFrameLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<InpaintingModelType>('quality');
    const [prompt, setPrompt] = useState('clean background, seamless, natural');
    const [strength, setStrength] = useState(0.95);

    // Undo history - stores original frame data before edits
    const [frameHistory, setFrameHistory] = useState<Map<number, string>>(new Map());

    // Mask storage - stores mask data URL per frame index
    const [frameMasks, setFrameMasks] = useState<Map<number, string>>(new Map());
    const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);
    const previousFrameIndexRef = useRef<number | null>(null);

    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const cursorRef = useRef<HTMLDivElement>(null);
    const isDrawingRef = useRef(false);
    const brushSizeRef = useRef(brushSize);
    const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const dimensionsRef = useRef({ w: 0, h: 0 });
    const initialLoadedRef = useRef(false);

    const [displayDimensions, setDisplayDimensions] = useState({ w: 0, h: 0 });

    // Keep brush size ref in sync
    useEffect(() => {
        brushSizeRef.current = brushSize;
        if (cursorRef.current) {
            cursorRef.current.style.width = `${brushSize}px`;
            cursorRef.current.style.height = `${brushSize}px`;
        }
    }, [brushSize]);

    // Load initial video if provided
    useEffect(() => {
        if (!initialVideoUrl || initialLoadedRef.current) return;
        initialLoadedRef.current = true;
        handleExtractFrames(initialVideoUrl);
    }, [initialVideoUrl]);

    // Save current mask to storage
    const saveCurrentMask = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || previousFrameIndexRef.current === null) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Check if canvas has any content
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0); // Check alpha channel

        if (hasContent) {
            const dataUrl = canvas.toDataURL('image/png');
            setFrameMasks(prev => {
                const newMap = new Map(prev);
                newMap.set(previousFrameIndexRef.current!, dataUrl);
                return newMap;
            });
        } else {
            // Remove mask if canvas is empty
            setFrameMasks(prev => {
                const newMap = new Map(prev);
                newMap.delete(previousFrameIndexRef.current!);
                return newMap;
            });
        }
    }, []);

    // Restore mask from storage
    const restoreMask = useCallback((frameIndex: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const savedMask = frameMasks.get(frameIndex);
        if (savedMask) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = savedMask;
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [frameMasks]);

    // Handle frame change - save current mask and prepare for new frame
    useEffect(() => {
        // Save mask from previous frame before switching
        if (previousFrameIndexRef.current !== null && previousFrameIndexRef.current !== currentFrameIndex) {
            saveCurrentMask();
        }

        // Reset dimensions to trigger fresh load
        setDisplayDimensions({ w: 0, h: 0 });
        setIsFrameLoading(true);

        // Update previous frame index
        previousFrameIndexRef.current = currentFrameIndex;
    }, [currentFrameIndex, saveCurrentMask]);

    // Playback logic
    useEffect(() => {
        if (isPlaying && session) {
            playIntervalRef.current = setInterval(() => {
                setCurrentFrameIndex(prev => {
                    if (prev >= session.frames.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000 / session.fps);
        } else {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
                playIntervalRef.current = null;
            }
        }

        return () => {
            if (playIntervalRef.current) {
                clearInterval(playIntervalRef.current);
            }
        };
    }, [isPlaying, session]);

    const handleExtractFrames = async (videoUrlOrFile: string | File) => {
        setIsExtracting(true);
        try {
            let res: Response;

            if (typeof videoUrlOrFile === 'string') {
                // URL provided - send as JSON
                res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/extract-frames`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl: videoUrlOrFile, maxFrames: 300 })
                });
            } else {
                // File provided - upload as FormData
                const formData = new FormData();
                formData.append('video', videoUrlOrFile);
                formData.append('maxFrames', '300');

                res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/extract-frames`, {
                    method: 'POST',
                    body: formData
                });
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Frame extraction failed');
            }

            const data = await res.json();
            setSession({
                sessionId: data.sessionId,
                frames: data.frames,
                fps: data.fps,
                duration: data.duration,
                totalFrames: data.totalFrames
            });
            setCurrentFrameIndex(0);
            setEditedFrames(new Set());
            toast.success(`Extracted ${data.totalFrames} frames at ${Math.round(data.fps)} fps`);

        } catch (err: any) {
            console.error('Frame extraction failed:', err);
            toast.error(err.message || 'Failed to extract frames');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.info('Processing video...');

        try {
            // Upload the file directly to backend for processing
            await handleExtractFrames(file);
        } catch (err) {
            toast.error('Failed to process video');
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const container = containerRef.current;

        // Use container width if available, otherwise fallback to window or default
        const maxWidth = container?.clientWidth || window.innerWidth * 0.6 || 800;
        const maxHeight = 500;
        let w = img.naturalWidth;
        let h = img.naturalHeight;

        if (w === 0 || h === 0) {
            setIsFrameLoading(false);
            return;
        }

        const ratio = w / h;

        if (w > maxWidth) { w = maxWidth; h = w / ratio; }
        if (h > maxHeight) { h = maxHeight; w = h * ratio; }

        const finalW = Math.round(w);
        const finalH = Math.round(h);

        dimensionsRef.current = { w: finalW, h: finalH };
        setDisplayDimensions({ w: finalW, h: finalH });
        setIsFrameLoading(false);
    };

    // Setup canvas dimensions when they change, then restore any saved mask
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && displayDimensions.w > 0 && displayDimensions.h > 0) {
            canvas.width = displayDimensions.w;
            canvas.height = displayDimensions.h;
            // Restore saved mask for this frame (if any)
            restoreMask(currentFrameIndex);
        }
    }, [displayDimensions, currentFrameIndex, restoreMask]);

    // Drawing handlers
    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        const cursor = cursorRef.current;
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
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';

            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const handleMouseDown = (e: MouseEvent) => {
            isDrawingRef.current = true;
            drawAt(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            isDrawingRef.current = false;
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (cursor) {
                const rect = wrapper.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                cursor.style.left = `${x - brushSizeRef.current / 2}px`;
                cursor.style.top = `${y - brushSizeRef.current / 2}px`;
            }
            drawAt(e.clientX, e.clientY);
        };

        const handleMouseEnter = () => {
            if (cursor) cursor.style.display = 'block';
        };

        const handleMouseLeave = () => {
            if (cursor) cursor.style.display = 'none';
            isDrawingRef.current = false;
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        };

        wrapper.addEventListener('mousedown', handleMouseDown);
        wrapper.addEventListener('mouseup', handleMouseUp);
        wrapper.addEventListener('mousemove', handleMouseMove);
        wrapper.addEventListener('mouseenter', handleMouseEnter);
        wrapper.addEventListener('mouseleave', handleMouseLeave);

        const handleGlobalMouseUp = () => {
            if (isDrawingRef.current) {
                isDrawingRef.current = false;
                const ctx = canvas.getContext('2d');
                ctx?.beginPath();
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            wrapper.removeEventListener('mousedown', handleMouseDown);
            wrapper.removeEventListener('mouseup', handleMouseUp);
            wrapper.removeEventListener('mousemove', handleMouseMove);
            wrapper.removeEventListener('mouseenter', handleMouseEnter);
            wrapper.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [session, currentFrameIndex, displayDimensions]);

    const clearMask = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    // Save original frame data before editing (for undo)
    const saveOriginalFrame = async (frameIndex: number) => {
        if (!session || frameHistory.has(frameIndex)) return; // Already saved

        const frameUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[frameIndex].url}`;
        try {
            const response = await fetch(frameUrl);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            setFrameHistory(prev => new Map(prev).set(frameIndex, dataUrl));
        } catch (err) {
            console.error('Failed to save original frame for undo:', err);
        }
    };

    // Undo edit for current frame
    const handleUndoFrame = async () => {
        if (!session || !frameHistory.has(currentFrameIndex)) return;

        setIsProcessing(true);
        try {
            const originalDataUrl = frameHistory.get(currentFrameIndex)!;

            // Convert data URL back to blob
            const response = await fetch(originalDataUrl);
            const blob = await response.blob();

            // Save original frame back to server
            const saveFormData = new FormData();
            saveFormData.append('frame', blob, 'restored_frame.png');

            const frameFilename = session.frames[currentFrameIndex].url.split('/').pop() || '';

            const saveRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/frames/${session.sessionId}/file/${frameFilename}`,
                { method: 'POST', body: saveFormData }
            );

            if (!saveRes.ok) throw new Error('Failed to restore frame');

            // Remove from history and edited set
            setFrameHistory(prev => {
                const newMap = new Map(prev);
                newMap.delete(currentFrameIndex);
                return newMap;
            });
            setEditedFrames(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentFrameIndex);
                return newSet;
            });

            // Update frame cache key to refresh display
            const cacheKey = Date.now();
            setSession(prev => {
                if (!prev) return prev;
                const newFrames = [...prev.frames];
                newFrames[currentFrameIndex] = {
                    ...newFrames[currentFrameIndex],
                    _cacheKey: cacheKey
                };
                return { ...prev, frames: newFrames };
            });

            // Force image reload
            if (imageRef.current) {
                imageRef.current.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[currentFrameIndex].url}?t=${cacheKey}`;
            }

            toast.success('Frame restored to original');
        } catch (err) {
            console.error('Failed to undo frame edit:', err);
            toast.error('Failed to restore frame');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEraseFrame = async () => {
        if (!session || !canvasRef.current || !imageRef.current) return;

        // Save original frame for undo (before any edits)
        await saveOriginalFrame(currentFrameIndex);

        setIsProcessing(true);
        try {
            const canvas = canvasRef.current;

            // Get current frame image and its actual dimensions
            const frameUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[currentFrameIndex].url}`;
            const imgResponse = await fetch(frameUrl);
            const imgBlob = await imgResponse.blob();

            // Load frame image to get actual dimensions
            const frameImg = new Image();
            await new Promise<void>((resolve, reject) => {
                frameImg.onload = () => resolve();
                frameImg.onerror = reject;
                frameImg.src = URL.createObjectURL(imgBlob);
            });
            const frameWidth = frameImg.naturalWidth;
            const frameHeight = frameImg.naturalHeight;
            URL.revokeObjectURL(frameImg.src);

            // Create binary mask scaled to frame dimensions
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = frameWidth;
            maskCanvas.height = frameHeight;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) throw new Error('Failed to create mask context');

            // Draw the display canvas mask scaled to frame size
            maskCtx.drawImage(canvas, 0, 0, frameWidth, frameHeight);

            // Convert to binary mask (white = remove, black = keep)
            const imageData = maskCtx.getImageData(0, 0, frameWidth, frameHeight);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 0) {
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                    data[i + 3] = 255;
                } else {
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                    data[i + 3] = 255;
                }
            }
            maskCtx.putImageData(imageData, 0, 0);

            const maskBlob = await new Promise<Blob | null>(r => maskCanvas.toBlob(r, 'image/png'));
            if (!maskBlob) throw new Error('Failed to create mask');

            // Call magic eraser
            const formData = new FormData();
            formData.append('image', imgBlob, 'frame.png');
            formData.append('mask', maskBlob, 'mask.png');
            formData.append('prompt', prompt);
            formData.append('model', selectedModel);
            formData.append('strength', strength.toString());

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/magic-eraser`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Magic eraser failed');

            // Save edited frame back to session
            const editedBlob = await res.blob();
            const saveFormData = new FormData();
            saveFormData.append('frame', editedBlob, 'edited_frame.png');

            // Extract actual filename from the frame URL to avoid index mismatch
            const frameFilename = session.frames[currentFrameIndex].url.split('/').pop() || '';

            const saveRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/frames/${session.sessionId}/file/${frameFilename}`,
                { method: 'POST', body: saveFormData }
            );

            if (!saveRes.ok) throw new Error('Failed to save edited frame');

            // Mark frame as edited and clear mask
            setEditedFrames(prev => new Set(prev).add(currentFrameIndex));

            // Update frame cache key to bust browser cache
            const cacheKey = Date.now();
            setSession(prev => {
                if (!prev) return prev;
                const newFrames = [...prev.frames];
                newFrames[currentFrameIndex] = {
                    ...newFrames[currentFrameIndex],
                    _cacheKey: cacheKey
                };
                return { ...prev, frames: newFrames };
            });

            clearMask();

            // Force image reload with cache buster
            const img = imageRef.current;
            if (img) {
                img.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[currentFrameIndex].url}?t=${cacheKey}`;
            }

            toast.success('Frame edited!');

        } catch (err: any) {
            console.error('Frame erase failed:', err);
            toast.error('Failed to erase');
        } finally {
            setIsProcessing(false);
        }
    };

    // Batch erase all frames that have masks
    const handleEraseAllMasked = async () => {
        if (!session) return;

        // First save the current frame's mask
        saveCurrentMask();

        // Get all frames with masks (need to wait a tick for state to update)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Create a copy of current masks including current frame
        const allMasks = new Map(frameMasks);

        // Check if current frame has mask content
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
                if (hasContent) {
                    allMasks.set(currentFrameIndex, canvas.toDataURL('image/png'));
                }
            }
        }

        const maskedFrameIndices = Array.from(allMasks.keys()).sort((a, b) => a - b);

        if (maskedFrameIndices.length === 0) {
            toast.error('No masks to process. Paint masks on frames first.');
            return;
        }

        setIsProcessing(true);
        setProcessingProgress({ current: 0, total: maskedFrameIndices.length });

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < maskedFrameIndices.length; i++) {
            const frameIndex = maskedFrameIndices[i];
            setProcessingProgress({ current: i + 1, total: maskedFrameIndices.length });

            try {
                // Save original frame for undo (before any edits)
                await saveOriginalFrame(frameIndex);

                const maskDataUrl = allMasks.get(frameIndex)!;

                // Get frame image and its dimensions (add cache buster)
                const frameUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[frameIndex].url}?t=${Date.now()}`;
                const imgResponse = await fetch(frameUrl);
                if (!imgResponse.ok) {
                    throw new Error(`Failed to fetch frame ${frameIndex}: ${imgResponse.status}`);
                }
                const imgBlob = await imgResponse.blob();

                // Load the frame image to get its actual dimensions
                const frameImg = new Image();
                await new Promise<void>((resolve, reject) => {
                    frameImg.onload = () => resolve();
                    frameImg.onerror = reject;
                    frameImg.src = URL.createObjectURL(imgBlob);
                });
                const frameWidth = frameImg.naturalWidth;
                const frameHeight = frameImg.naturalHeight;
                URL.revokeObjectURL(frameImg.src);

                // Load the mask image (at display canvas size)
                const maskImg = new Image();
                await new Promise<void>((resolve, reject) => {
                    maskImg.onload = () => resolve();
                    maskImg.onerror = reject;
                    maskImg.src = maskDataUrl;
                });

                // Scale mask to match frame dimensions
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = frameWidth;
                maskCanvas.height = frameHeight;
                const maskCtx = maskCanvas.getContext('2d');
                if (!maskCtx) throw new Error('Failed to create mask context');

                // Draw mask scaled to frame size
                maskCtx.drawImage(maskImg, 0, 0, frameWidth, frameHeight);

                // Convert to binary mask
                const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
                const data = imageData.data;
                for (let j = 0; j < data.length; j += 4) {
                    if (data[j + 3] > 0) {
                        data[j] = 255;
                        data[j + 1] = 255;
                        data[j + 2] = 255;
                        data[j + 3] = 255;
                    } else {
                        data[j] = 0;
                        data[j + 1] = 0;
                        data[j + 2] = 0;
                        data[j + 3] = 255;
                    }
                }
                maskCtx.putImageData(imageData, 0, 0);

                const maskBlob = await new Promise<Blob | null>(r => maskCanvas.toBlob(r, 'image/png'));
                if (!maskBlob) throw new Error('Failed to create mask blob');

                // Call magic eraser
                const formData = new FormData();
                formData.append('image', imgBlob, 'frame.png');
                formData.append('mask', maskBlob, 'mask.png');
                formData.append('prompt', prompt);
                formData.append('model', selectedModel);
                formData.append('strength', strength.toString());

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/magic-eraser`, {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error(`Magic eraser failed for frame ${frameIndex}:`, errorText);
                    throw new Error(`Magic eraser failed: ${errorText}`);
                }

                // Verify the response is an image
                const contentType = res.headers.get('content-type');
                if (!contentType || !contentType.includes('image')) {
                    const errorText = await res.text();
                    console.error(`Magic eraser returned non-image for frame ${frameIndex}:`, contentType, errorText);
                    throw new Error(`Magic eraser returned non-image: ${contentType}`);
                }

                // Save edited frame back to session
                const editedBlob = await res.blob();
                console.log(`Frame ${frameIndex}: received blob size ${editedBlob.size}, type ${editedBlob.type}`);

                if (editedBlob.size < 1000) {
                    console.error(`Frame ${frameIndex}: blob suspiciously small (${editedBlob.size} bytes)`);
                }

                const saveFormData = new FormData();
                saveFormData.append('frame', editedBlob, 'edited_frame.png');

                // Extract actual filename from the frame URL to avoid index mismatch
                const frameFilename = session.frames[frameIndex].url.split('/').pop() || '';
                console.log(`Frame ${frameIndex}: saving to filename ${frameFilename}`);

                const saveRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/frames/${session.sessionId}/file/${frameFilename}`,
                    { method: 'POST', body: saveFormData }
                );

                if (!saveRes.ok) throw new Error('Failed to save edited frame');

                // Mark frame as edited and update cache key
                setEditedFrames(prev => new Set(prev).add(frameIndex));

                // Update frame cache key to bust browser cache
                setSession(prev => {
                    if (!prev) return prev;
                    const newFrames = [...prev.frames];
                    newFrames[frameIndex] = {
                        ...newFrames[frameIndex],
                        _cacheKey: Date.now()
                    };
                    return { ...prev, frames: newFrames };
                });

                successCount++;

            } catch (err) {
                console.error(`Failed to process frame ${frameIndex}:`, err);
                failCount++;
            }
        }

        // Clear all masks after processing
        setFrameMasks(new Map());
        clearMask();

        // Force reload current frame image
        if (imageRef.current) {
            imageRef.current.src = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${session.frames[currentFrameIndex].url}?t=${Date.now()}`;
        }

        setIsProcessing(false);
        setProcessingProgress(null);

        if (failCount === 0) {
            toast.success(`Successfully processed ${successCount} frames!`);
        } else {
            toast.warning(`Processed ${successCount} frames, ${failCount} failed`);
        }
    };

    // Get count of frames with masks (including current unsaved)
    const getMaskedFrameCount = useCallback(() => {
        let count = frameMasks.size;
        // Check if current frame has unsaved mask
        const canvas = canvasRef.current;
        if (canvas && !frameMasks.has(currentFrameIndex)) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasContent = imageData.data.some((val, i) => i % 4 === 3 && val > 0);
                if (hasContent) count++;
            }
        }
        return count;
    }, [frameMasks, currentFrameIndex]);

    const handleReconstructVideo = async () => {
        if (!session) return;

        setIsReconstructing(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/reconstruct/${session.sessionId}`,
                { method: 'POST' }
            );

            if (!res.ok) throw new Error('Video reconstruction failed');

            const { videoUrl } = await res.json();

            // Download the video
            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = `rotoscope_${Date.now()}.mp4`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success('Video exported!');

        } catch (err: any) {
            console.error('Reconstruction failed:', err);
            toast.error('Failed to export video');
        } finally {
            setIsReconstructing(false);
        }
    };

    const handleCleanupSession = async () => {
        if (!session) return;

        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/session/${session.sessionId}`,
                { method: 'DELETE' }
            );
            setSession(null);
            setCurrentFrameIndex(0);
            setEditedFrames(new Set());
            toast.success('Session cleared');
        } catch (err) {
            toast.error('Failed to cleanup session');
        }
    };

    const currentFrame = session?.frames[currentFrameIndex];

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                    <Film className="w-6 h-6" />
                    Rotoscope
                </h2>

                {session && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {editedFrames.size} / {session.totalFrames} frames edited
                        </span>
                        <button
                            onClick={handleReconstructVideo}
                            disabled={isReconstructing || editedFrames.size === 0}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isReconstructing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Export Video
                        </button>
                        <button
                            onClick={handleCleanupSession}
                            className="p-1.5 bg-red-600/30 hover:bg-red-600/50 rounded text-red-400"
                            title="Clear session"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex min-h-0">
                {!session ? (
                    // Upload area
                    <div className="flex-1 flex items-center justify-center p-8">
                        {isExtracting ? (
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
                                <p className="text-gray-400">Extracting frames...</p>
                                <p className="text-xs text-gray-600 mt-1">This may take a moment for longer videos</p>
                            </div>
                        ) : (
                            <label className="border-2 border-dashed border-white/20 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                                <Film className="w-12 h-12 text-gray-500 mb-4" />
                                <span className="text-gray-400 font-medium">Upload Video for Rotoscoping</span>
                                <span className="text-xs text-gray-600 mt-2">MP4, MOV, or WebM</span>
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={handleVideoUpload}
                                />
                            </label>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 min-w-0">
                        {/* Frame editor area */}
                        <div className="flex-1 flex gap-4 p-4 min-h-0 min-w-0 overflow-hidden">
                            {/* Controls */}
                            <div className="w-56 space-y-4 flex-none">
                                {/* Model Selection */}
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <label className="text-xs font-medium text-gray-400 mb-2 block">Quality</label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {MODEL_OPTIONS.map((model) => (
                                            <button
                                                key={model.key}
                                                onClick={() => setSelectedModel(model.key)}
                                                disabled={isProcessing}
                                                className={`p-1.5 rounded text-[10px] flex flex-col items-center gap-0.5 transition-all ${
                                                    selectedModel === model.key
                                                        ? 'bg-cyan-600 text-white'
                                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                                }`}
                                                title={model.description}
                                            >
                                                {model.icon}
                                                <span>{model.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Prompt (only for quality/premium) */}
                                {selectedModel !== 'fast' && (
                                    <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                        <label className="text-xs font-medium text-gray-400 mb-1 block">Fill Prompt</label>
                                        <input
                                            type="text"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            disabled={isProcessing}
                                            placeholder="What to fill with..."
                                            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600"
                                        />
                                    </div>
                                )}

                                {/* Strength (only for quality/premium) */}
                                {selectedModel !== 'fast' && (
                                    <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-gray-400">Strength</label>
                                            <span className="text-xs text-cyan-400 font-bold">{Math.round(strength * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="50"
                                            max="100"
                                            step="5"
                                            value={strength * 100}
                                            onChange={(e) => setStrength(parseInt(e.target.value) / 100)}
                                            disabled={isProcessing}
                                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                        <p className="text-[10px] text-gray-600 mt-1">Higher = more replacement, Lower = more blending</p>
                                    </div>
                                )}

                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2 mb-2 text-cyan-300">
                                        <Brush className="w-4 h-4" />
                                        <span className="font-medium text-sm">Brush: {brushSize}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        value={brushSize}
                                        onChange={e => setBrushSize(parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={clearMask}
                                        className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded text-xs text-gray-300"
                                    >
                                        Clear Mask
                                    </button>
                                    <button
                                        onClick={handleUndoFrame}
                                        disabled={isProcessing || !frameHistory.has(currentFrameIndex)}
                                        className="flex-1 bg-orange-600/80 hover:bg-orange-500 py-2 rounded text-xs text-white font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Restore original frame"
                                    >
                                        <Undo2 className="w-3 h-3" />
                                        Undo
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleEraseFrame}
                                        disabled={isProcessing}
                                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 py-2 rounded text-xs text-white font-bold flex items-center justify-center gap-1"
                                    >
                                        {isProcessing && !processingProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eraser className="w-3 h-3" />}
                                        Erase Frame
                                    </button>
                                </div>

                                {/* Batch erase section */}
                                <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-gray-400">Masked frames:</span>
                                        <span className="text-xs font-bold text-cyan-400">{frameMasks.size}</span>
                                    </div>
                                    <button
                                        onClick={handleEraseAllMasked}
                                        disabled={isProcessing || frameMasks.size === 0}
                                        className="w-full bg-purple-600 hover:bg-purple-500 py-2 rounded text-xs text-white font-bold flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingProgress ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                {processingProgress.current}/{processingProgress.total}
                                            </>
                                        ) : (
                                            <>
                                                <Eraser className="w-3 h-3" />
                                                Erase All Masked
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="text-xs text-gray-500 space-y-1">
                                    <p className="font-medium text-gray-400">How to use:</p>
                                    <p>1. Paint mask over object</p>
                                    <p>2. Navigate to next frame</p>
                                    <p>3. Repeat for all frames</p>
                                    <p>4. Click "Erase All Masked"</p>
                                    <p>5. Export when done</p>
                                </div>
                            </div>

                            {/* Frame preview */}
                            <div
                                ref={containerRef}
                                className="flex-1 min-w-0 bg-black/40 rounded-lg overflow-hidden border border-white/10 flex items-center justify-center relative"
                            >
                                {!currentFrame && (
                                    <p className="text-gray-500 text-sm">No frame selected</p>
                                )}
                                {/* Main frame image */}
                                {currentFrame && (
                                    <img
                                        ref={imageRef}
                                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${currentFrame.url}${currentFrame._cacheKey ? `?t=${currentFrame._cacheKey}` : ''}`}
                                        alt={`Frame ${currentFrameIndex + 1}`}
                                        className="max-w-full max-h-[500px] object-contain pointer-events-none"
                                        onLoad={handleImageLoad}
                                        onError={(e) => {
                                            console.error('Frame image failed to load:', currentFrame.url, e);
                                            setIsFrameLoading(false);
                                        }}
                                    />
                                )}
                                {/* Wrapper for canvas overlay - only when dimensions set */}
                                {currentFrame && displayDimensions.w > 0 && (
                                    <div
                                        ref={wrapperRef}
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: displayDimensions.w,
                                            height: displayDimensions.h,
                                            cursor: 'none',
                                        }}
                                    >
                                        {displayDimensions.w > 0 && (
                                            <canvas
                                                ref={canvasRef}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    touchAction: 'none',
                                                    cursor: 'none',
                                                }}
                                            />
                                        )}
                                        <div
                                            ref={cursorRef}
                                            className="absolute rounded-full border-2 border-white bg-cyan-500/30 pointer-events-none z-10"
                                            style={{
                                                width: brushSize,
                                                height: brushSize,
                                                display: 'none',
                                                boxShadow: '0 0 4px 2px rgba(0,0,0,0.5)'
                                            }}
                                        />

                                        {/* Edited badge */}
                                        {editedFrames.has(currentFrameIndex) && (
                                            <div className="absolute top-2 left-2 bg-green-500/90 text-black text-xs font-bold px-2 py-1 rounded">
                                                EDITED
                                            </div>
                                        )}

                                        {isProcessing && (
                                            <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center">
                                                <div className="text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-2" />
                                                    <span className="text-xs text-white">Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <FrameTimeline
                            frames={session.frames}
                            currentFrameIndex={currentFrameIndex}
                            onFrameSelect={setCurrentFrameIndex}
                            fps={session.fps}
                            isPlaying={isPlaying}
                            onPlayPause={() => setIsPlaying(!isPlaying)}
                            editedFrames={editedFrames}
                            maskedFrames={new Set(frameMasks.keys())}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

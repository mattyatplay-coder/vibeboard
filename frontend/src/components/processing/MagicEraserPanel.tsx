import React, { useState, useRef, useEffect } from 'react';
import {
  Loader2,
  Upload,
  Eraser,
  Brush,
  Save,
  Undo2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Zap,
  Crown,
  Wand2,
  ChevronDown,
  ChevronUp,
  Settings2,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip } from '@/components/ui/Tooltip';

const MAX_HISTORY = 10;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

type InpaintingModelType = 'fast' | 'quality' | 'premium';

interface ModelOption {
  key: InpaintingModelType;
  name: string;
  description: string;
  cost: string;
  icon: React.ReactNode;
}

interface MagicEraserPanelProps {
  initialImageUrl?: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    key: 'fast',
    name: 'Fast',
    description: 'Quick removal, basic quality',
    cost: '~$0.01',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    key: 'quality',
    name: 'Quality',
    description: 'Better context, good for skin',
    cost: '~$0.02',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    key: 'premium',
    name: 'Premium',
    description: 'Best quality, excellent textures',
    cost: '~$0.04',
    icon: <Crown className="h-4 w-4" />,
  },
];

export function MagicEraserPanel({ initialImageUrl }: MagicEraserPanelProps) {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const initialLoadedRef = useRef(false);
  const [brushSize, setBrushSize] = useState(30);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedModel, setSelectedModel] = useState<InpaintingModelType>('quality');
  const [prompt, setPrompt] = useState('clean skin, high quality, natural texture');
  const [strength, setStrength] = useState(0.95);

  // Advanced parameters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inferenceSteps, setInferenceSteps] = useState(28);
  const [guidanceScale, setGuidanceScale] = useState(3.5);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [maskExpansion, setMaskExpansion] = useState(15); // Pixels to expand mask (prevents ghosting)

  // AI Assist
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAIReasoning, setLastAIReasoning] = useState<string | null>(null);
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedbackCorrection, setFeedbackCorrection] = useState('');

  // Undo history stack
  const [history, setHistory] = useState<File[]>([]);

  // Preview state for accept/reject workflow
  const [previewResult, setPreviewResult] = useState<File | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Use refs for dimensions to avoid re-renders during drawing
  const dimensionsRef = useRef({ w: 0, h: 0 });
  const originalDimensionsRef = useRef({ w: 0, h: 0 });
  const isDrawingRef = useRef(false);
  const brushSizeRef = useRef(brushSize);
  const zoomLevelRef = useRef(zoomLevel);

  // State for display dimensions (triggers re-render for zoom)
  const [displayDimensions, setDisplayDimensions] = useState({ w: 0, h: 0 });

  // Keep brushSizeRef in sync
  useEffect(() => {
    brushSizeRef.current = brushSize;
    // Update cursor size directly (no zoom scaling - cursor is inside zoomed wrapper)
    if (cursorRef.current) {
      cursorRef.current.style.width = `${brushSize}px`;
      cursorRef.current.style.height = `${brushSize}px`;
    }
  }, [brushSize]);

  // Keep zoomLevelRef in sync
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

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
        setHistory([]);
        setPreviewResult(null);
        setZoomLevel(1);
        setDisplayDimensions({ w: 0, h: 0 }); // Reset dimensions so image loads fresh
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setBaseImage(file);
      setHistory([]); // Clear history when new image uploaded
      setPreviewResult(null);
      setZoomLevel(1); // Reset zoom on new image
      setDisplayDimensions({ w: 0, h: 0 }); // Reset dimensions so image loads fresh
    }
  };

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
      // Only when not typing in an input
      if (e.target instanceof HTMLInputElement) return;

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

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    const canvas = maskCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!container || !canvas || !wrapper) return;

    // Store original dimensions for mask scaling
    originalDimensionsRef.current = { w: img.naturalWidth, h: img.naturalHeight };

    // Calculate fit for display
    const maxWidth = container.clientWidth;
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

    // Only update if dimensions actually changed (prevents infinite loop)
    if (dimensionsRef.current.w !== finalW || dimensionsRef.current.h !== finalH) {
      dimensionsRef.current = { w: finalW, h: finalH };
      setDisplayDimensions({ w: finalW, h: finalH });

      // Set canvas buffer dimensions (always at base size, not zoomed)
      // NOTE: Setting canvas.width/height clears the canvas content!
      canvas.width = finalW;
      canvas.height = finalH;

      console.log('[MagicEraser] handleImageLoad complete', {
        natural: { w: img.naturalWidth, h: img.naturalHeight },
        display: { w: finalW, h: finalH },
        canvasBuffer: { w: canvas.width, h: canvas.height },
      });
    }
  };

  // Native DOM event handlers for drawing - completely outside React
  useEffect(() => {
    // Wait for dimensions to be set before attaching events
    if (displayDimensions.w === 0 || displayDimensions.h === 0) return;

    const canvas = maskCanvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    console.log('[MagicEraser] Setting up drawing events', {
      displayDimensions,
      canvasBuffer: { w: canvas.width, h: canvas.height },
      canvasStyle: { w: canvas.style.width, h: canvas.style.height },
    });

    const drawAt = (clientX: number, clientY: number) => {
      if (!isDrawingRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('[MagicEraser] Canvas rect is 0', rect);
        return;
      }

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
      console.log('[MagicEraser] mousedown');
      isDrawingRef.current = true;
      drawAt(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      isDrawingRef.current = false;
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Update cursor position directly via DOM (use ref.current to get latest)
      const cursor = cursorRef.current;
      if (cursor) {
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const zoom = zoomLevelRef.current;
        // Scale cursor size with zoom, position in zoomed space
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

    // Add native event listeners to canvas for drawing
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    // Attach cursor visibility events to wrapper (not canvas) so they work even when canvas has pointerEvents:none
    wrapper.addEventListener('mouseenter', handleMouseEnter);
    wrapper.addEventListener('mouseleave', handleMouseLeave);
    wrapper.addEventListener('mousemove', handleMouseMove);

    // Global mouseup to handle mouse release outside canvas
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
  }, [displayDimensions]); // Re-attach only when dimensions change

  const clearMask = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDownload = () => {
    if (!baseImage) return;
    const url = URL.createObjectURL(baseImage);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magic-eraser-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Image downloaded!');
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousImage = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setBaseImage(previousImage);
    setPreviewResult(null);
    clearMask();
    toast.success('Undone!');
  };

  const handleAcceptResult = () => {
    if (!previewResult || !baseImage) return;
    // Push current to history before accepting new result
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), baseImage]);
    setBaseImage(previewResult);
    setPreviewResult(null);
    savedMaskDataRef.current = null; // Clear saved mask since we accepted
    clearMask();
    toast.success('Changes applied!');
  };

  // Track if we're returning from preview (to preserve mask)
  const returningFromPreviewRef = useRef(false);
  // Store mask data when entering preview mode so we can restore on reject
  const savedMaskDataRef = useRef<ImageData | null>(null);

  const handleRejectResult = () => {
    console.log(
      '[MagicEraser] handleRejectResult called, savedMaskData:',
      savedMaskDataRef.current ? 'exists' : 'null'
    );
    returningFromPreviewRef.current = true;
    setPreviewResult(null);

    // Need to wait for the image to fully load before restoring mask
    // Use multiple nested requestAnimationFrames to ensure we're after render + image load
    const restoreMask = () => {
      const canvas = maskCanvasRef.current;
      console.log('[MagicEraser] Attempting to restore mask', {
        canvas: !!canvas,
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
        savedMaskData: savedMaskDataRef.current
          ? {
              width: savedMaskDataRef.current.width,
              height: savedMaskDataRef.current.height,
            }
          : null,
      });

      if (canvas && savedMaskDataRef.current && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // If dimensions match, restore directly
          if (
            canvas.width === savedMaskDataRef.current.width &&
            canvas.height === savedMaskDataRef.current.height
          ) {
            ctx.putImageData(savedMaskDataRef.current, 0, 0);
            console.log('[MagicEraser] Restored mask directly (same dimensions)');
          } else {
            // Scale to fit new dimensions
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = savedMaskDataRef.current.width;
            tempCanvas.height = savedMaskDataRef.current.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx?.putImageData(savedMaskDataRef.current, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
            console.log('[MagicEraser] Restored mask with scaling');
          }
        }
      }
      returningFromPreviewRef.current = false;
    };

    // Wait for multiple frames to ensure image has loaded
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(restoreMask, 100); // Additional delay for image load
      });
    });

    toast.info('Changes discarded');
  };

  // AI-assisted parameter recommendation
  const handleAIAssist = async () => {
    if (!baseImage || !maskCanvasRef.current) {
      toast.error('Draw a mask first to get AI recommendations');
      return;
    }

    // Check if mask has any content
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const hasContent = maskData.data.some((v, i) => i % 4 === 3 && v > 0); // Check alpha channel
      if (!hasContent) {
        toast.error('Draw a mask first to get AI recommendations');
        return;
      }
    }

    setIsAnalyzing(true);
    try {
      const img = imageRef.current;
      if (!img) throw new Error('Image not loaded');

      // 1. Create ORIGINAL image (clean, no mask)
      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = img.naturalWidth;
      originalCanvas.height = img.naturalHeight;
      const origCtx = originalCanvas.getContext('2d');
      if (!origCtx) throw new Error('Failed to create canvas context');
      origCtx.drawImage(img, 0, 0);
      const originalBlob = await new Promise<Blob | null>(r =>
        originalCanvas.toBlob(r, 'image/jpeg', 0.85)
      );

      // 2. Create MASKED image (with red overlay showing what's selected)
      const maskedCanvas = document.createElement('canvas');
      maskedCanvas.width = img.naturalWidth;
      maskedCanvas.height = img.naturalHeight;
      const maskedCtx = maskedCanvas.getContext('2d');
      if (!maskedCtx) throw new Error('Failed to create masked canvas context');

      // Draw original image
      maskedCtx.drawImage(img, 0, 0);

      // Draw semi-transparent RED mask overlay (more visible)
      maskedCtx.globalAlpha = 0.6;
      maskedCtx.drawImage(maskCanvas, 0, 0, maskedCanvas.width, maskedCanvas.height);
      maskedCtx.globalAlpha = 1.0;

      const maskedBlob = await new Promise<Blob | null>(r =>
        maskedCanvas.toBlob(r, 'image/jpeg', 0.85)
      );

      if (!originalBlob || !maskedBlob) throw new Error('Failed to create images');

      // Send BOTH images to AI analysis endpoint
      const formData = new FormData();
      formData.append('original', originalBlob, 'original.jpg');
      formData.append('masked', maskedBlob, 'masked.jpg');
      formData.append('task', 'inpainting_recommendation');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/analyze-inpainting`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI analysis failed');
      }

      const data = await res.json();
      console.log('[MagicEraser] AI Assist response:', data);

      // Check if we got default/fallback response
      const isDefault =
        data.reasoning?.includes('Default settings applied') ||
        data.reasoning?.includes('AI response parsing failed');

      if (isDefault) {
        toast.error('AI analysis failed - using default settings. Please try again.', {
          duration: 4000,
        });
      }

      // Apply recommended settings - NEVER override user's custom prompt
      if (data.prompt) {
        const defaultPrompts = ['clean skin, high quality, natural texture', 'clean skin', ''];
        const isDefaultPrompt = defaultPrompts.some(
          d => prompt.trim().toLowerCase() === d.toLowerCase()
        );

        if (isDefaultPrompt) {
          // User hasn't customized prompt - use AI suggestion
          setPrompt(data.prompt);
        } else {
          // User has a custom prompt - keep it, but show AI suggestion in toast
          console.log(
            `[AI Assist] Keeping user prompt: "${prompt}", AI suggested: "${data.prompt}"`
          );
          toast.info(`AI suggested: "${data.prompt.substring(0, 60)}..." - Your prompt was kept.`, {
            duration: 4000,
          });
        }
      }

      if (data.negativePrompt) {
        // Merge negative prompts if user has one
        if (negativePrompt && negativePrompt.trim()) {
          // Combine both, avoiding duplicates
          const existingTerms = negativePrompt
            .toLowerCase()
            .split(',')
            .map(t => t.trim());
          const newTerms = data.negativePrompt.split(',').map((t: string) => t.trim());
          const uniqueNew = newTerms.filter(
            (t: string) => !existingTerms.includes(t.toLowerCase())
          );
          if (uniqueNew.length > 0) {
            setNegativePrompt(`${negativePrompt}, ${uniqueNew.join(', ')}`);
          }
        } else {
          setNegativePrompt(data.negativePrompt);
        }
      }

      // Only update numeric settings if AI actually analyzed (not defaults)
      if (!isDefault) {
        if (data.strength) setStrength(data.strength);
        if (data.inferenceSteps) setInferenceSteps(data.inferenceSteps);
        if (data.guidanceScale) setGuidanceScale(data.guidanceScale);
        if (data.maskExpansion !== undefined) setMaskExpansion(data.maskExpansion);
      }

      // Show advanced panel if we got advanced recommendations
      if (data.negativePrompt || data.inferenceSteps || data.guidanceScale || data.maskExpansion) {
        setShowAdvanced(true);
      }

      // Store reasoning for feedback
      if (data.reasoning) {
        setLastAIReasoning(data.reasoning);
      }

      // Show reasoning if available (and not a default response)
      if (data.reasoning && !isDefault) {
        toast.success(`AI: ${data.reasoning}`, {
          duration: 5000,
          style: { maxWidth: '450px' },
        });
      } else if (!isDefault) {
        toast.success('AI recommendations applied!');
      }
    } catch (err: any) {
      console.error('AI analysis failed:', err);
      toast.error(err.message || 'AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit feedback about AI Assist
  const handleFeedback = async (isHelpful: boolean) => {
    try {
      const payload: any = {
        context: 'magic-eraser',
        isHelpful,
        aiReasoning: lastAIReasoning || prompt,
      };

      // If negative feedback with correction, include it
      if (!isHelpful && feedbackCorrection.trim()) {
        payload.userCorrection = feedbackCorrection.trim();
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error('Failed to submit feedback');

      const data = await res.json();
      toast.success(data.message);

      // Reset feedback state
      setShowFeedbackInput(false);
      setFeedbackCorrection('');
      setLastAIReasoning(null);
    } catch (err: any) {
      console.error('Feedback submission failed:', err);
      toast.error('Failed to submit feedback');
    }
  };

  const handleErase = async () => {
    if (!baseImage || !maskCanvasRef.current) return;

    setIsProcessing(true);
    try {
      const origW = originalDimensionsRef.current.w;
      const origH = originalDimensionsRef.current.h;
      const displayW = dimensionsRef.current.w;
      const displayH = dimensionsRef.current.h;

      if (origW === 0 || origH === 0 || displayW === 0 || displayH === 0) {
        throw new Error('Image dimensions not set');
      }

      // Process display-sized mask to binary
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = displayW;
      displayCanvas.height = displayH;
      const displayCtx = displayCanvas.getContext('2d');
      if (!displayCtx) return;

      displayCtx.drawImage(maskCanvasRef.current, 0, 0, displayW, displayH);

      // Convert to binary (white where drawn, black elsewhere)
      const displayData = displayCtx.getImageData(0, 0, displayW, displayH);
      const data = displayData.data;
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
      displayCtx.putImageData(displayData, 0, 0);

      // Scale up to original dimensions
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = origW;
      tempCanvas.height = origH;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, origW, origH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(displayCanvas, 0, 0, origW, origH);

      const maskBlob = await new Promise<Blob | null>(r => tempCanvas.toBlob(r, 'image/png'));
      if (!maskBlob) throw new Error('Failed to generate mask');

      const formData = new FormData();
      formData.append('image', baseImage);
      formData.append('mask', maskBlob, 'mask.png');
      formData.append('prompt', prompt);
      formData.append('model', selectedModel);
      formData.append('strength', strength.toString());
      formData.append('inferenceSteps', inferenceSteps.toString());
      formData.append('guidanceScale', guidanceScale.toString());
      formData.append('maskExpansion', maskExpansion.toString());
      if (negativePrompt.trim()) {
        formData.append('negativePrompt', negativePrompt);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/magic-eraser`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) throw new Error('Magic Eraser failed');

      const blob = await res.blob();
      const resultFile = new File([blob], 'edited_image.png', { type: 'image/png' });

      // Save mask data before showing preview (so we can restore on reject)
      const canvas = maskCanvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        savedMaskDataRef.current = ctx?.getImageData(0, 0, canvas.width, canvas.height) || null;
        console.log('[MagicEraser] Saved mask data before preview', {
          width: canvas.width,
          height: canvas.height,
        });
      }

      // Set as preview instead of immediately applying
      setPreviewResult(resultFile);
      toast.info('Review the result - Accept or Reject');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to erase');
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine which image to display
  const displayImage = previewResult || baseImage;

  // Memoize the object URL to prevent creating new URLs on every render
  const displayImageUrl = React.useMemo(() => {
    if (!displayImage) return null;
    return URL.createObjectURL(displayImage);
  }, [displayImage]);

  // Cleanup object URL when it changes
  useEffect(() => {
    return () => {
      if (displayImageUrl) {
        URL.revokeObjectURL(displayImageUrl);
      }
    };
  }, [displayImageUrl]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-6">
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-pink-400">
        <Eraser className="h-6 w-6" />
        Magic Eraser
      </h2>

      <div className="flex min-h-0 flex-1 gap-8">
        {/* Controls */}
        <div className="w-64 flex-none space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Image</label>
            <label className="relative flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 p-4 transition-colors hover:bg-white/5">
              {baseImage ? (
                <img
                  src={URL.createObjectURL(baseImage)}
                  className="absolute inset-0 h-full w-full rounded-lg object-cover opacity-50"
                />
              ) : (
                <Upload className="mb-2 h-6 w-6 text-gray-500" />
              )}
              <span className="z-10 text-center text-xs text-gray-400">
                {baseImage ? 'Change Image' : 'Upload Image'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </label>
          </div>

          {baseImage && (
            <div className="space-y-4 rounded-lg border border-white/5 bg-black/20 p-4">
              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400">Quality Level</label>
                <div className="grid grid-cols-3 gap-1">
                  {MODEL_OPTIONS.map(model => (
                    <button
                      key={model.key}
                      onClick={() => setSelectedModel(model.key)}
                      disabled={!!previewResult}
                      className={`flex flex-col items-center gap-1 rounded p-2 text-xs transition-all ${
                        selectedModel === model.key
                          ? 'bg-pink-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      } ${previewResult ? 'cursor-not-allowed opacity-50' : ''}`}
                      title={`${model.description} (${model.cost})`}
                    >
                      {model.icon}
                      <span>{model.name}</span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] text-gray-500">
                  {MODEL_OPTIONS.find(m => m.key === selectedModel)?.description}
                </p>
              </div>

              {/* Prompt (only for quality/premium models) */}
              {selectedModel !== 'fast' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-400">Fill Prompt</label>
                  <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    disabled={!!previewResult}
                    placeholder="Describe what should fill the area..."
                    className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-gray-600 disabled:opacity-50"
                  />
                </div>
              )}

              {/* Strength slider (only for quality/premium models) */}
              {selectedModel !== 'fast' && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-gray-400">Strength</label>
                    <span className="text-xs text-gray-500">{(strength * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.01"
                    value={strength}
                    onChange={e => setStrength(parseFloat(e.target.value))}
                    disabled={!!previewResult}
                    className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-pink-500 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-gray-500">
                    Lower = blend with original, Higher = fully replace
                  </p>
                </div>
              )}

              {/* AI Assist Button */}
              {selectedModel !== 'fast' && (
                <button
                  onClick={handleAIAssist}
                  disabled={!!previewResult || isAnalyzing || !baseImage}
                  className="flex w-full items-center justify-center gap-2 rounded bg-gradient-to-r from-purple-600 to-blue-600 py-2 text-xs font-bold text-white transition-all hover:from-purple-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3 w-3" />
                      AI Assist (Recommend Settings)
                    </>
                  )}
                </button>
              )}

              {/* AI Assist Feedback - shown after AI has made recommendations */}
              {selectedModel !== 'fast' && lastAIReasoning && !previewResult && (
                <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-900/20 p-2">
                  <div className="max-h-24 overflow-y-auto">
                    <p className="text-[10px] break-words whitespace-pre-wrap text-purple-300">
                      AI: {lastAIReasoning}
                    </p>
                  </div>
                  {!showFeedbackInput ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">Was this helpful?</span>
                      <Tooltip content="Yes, this was helpful" side="top">
                        <button
                          onClick={() => handleFeedback(true)}
                          className="rounded p-1 text-green-400 transition-colors hover:bg-green-500/20"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                      </Tooltip>
                      <Tooltip content="No, AI got it wrong" side="top">
                        <button
                          onClick={() => setShowFeedbackInput(true)}
                          className="rounded p-1 text-red-400 transition-colors hover:bg-red-500/20"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] text-yellow-400">What should it have been?</p>
                      <input
                        type="text"
                        value={feedbackCorrection}
                        onChange={e => setFeedbackCorrection(e.target.value)}
                        placeholder="e.g., dark spot / artifact / tattoo residue"
                        className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white placeholder:text-gray-600"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleFeedback(false)}
                          className="flex-1 rounded bg-red-600 py-1 text-[10px] text-white hover:bg-red-500"
                        >
                          Submit
                        </button>
                        <button
                          onClick={() => {
                            setShowFeedbackInput(false);
                            setFeedbackCorrection('');
                          }}
                          className="rounded bg-gray-700 px-2 py-1 text-[10px] text-white hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Settings Toggle */}
              {selectedModel !== 'fast' && (
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  disabled={!!previewResult}
                  className="flex w-full items-center justify-center gap-1 rounded bg-white/5 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-300 disabled:opacity-50"
                >
                  <Settings2 className="h-3 w-3" />
                  Advanced Settings
                  {showAdvanced ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}

              {/* Advanced Settings Panel */}
              {selectedModel !== 'fast' && showAdvanced && (
                <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
                  {/* Inference Steps */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">Inference Steps</label>
                      <span className="text-xs text-gray-500">{inferenceSteps}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="50"
                      step="2"
                      value={inferenceSteps}
                      onChange={e => setInferenceSteps(parseInt(e.target.value))}
                      disabled={!!previewResult}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-pink-500 disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500">
                      Higher = more refined details, slower
                    </p>
                  </div>

                  {/* Guidance Scale */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">Guidance Scale</label>
                      <span className="text-xs text-gray-500">{guidanceScale.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={guidanceScale}
                      onChange={e => setGuidanceScale(parseFloat(e.target.value))}
                      disabled={!!previewResult}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-pink-500 disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500">Higher = stricter prompt adherence</p>
                  </div>

                  {/* Negative Prompt */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Negative Prompt</label>
                    <textarea
                      value={negativePrompt}
                      onChange={e => setNegativePrompt(e.target.value)}
                      disabled={!!previewResult}
                      placeholder="bad anatomy, extra fingers, blurry, distorted..."
                      className="h-16 w-full resize-none rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-gray-600 disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500">What to avoid generating</p>
                  </div>

                  {/* Mask Expansion */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-400">Mask Expansion</label>
                      <span className="text-xs text-gray-500">{maskExpansion}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="5"
                      value={maskExpansion}
                      onChange={e => setMaskExpansion(parseInt(e.target.value))}
                      disabled={!!previewResult}
                      className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-pink-500 disabled:opacity-50"
                    />
                    <p className="text-[10px] text-gray-500">
                      Expand mask edges to prevent ghosting (higher for jewelry, chains)
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-2 flex items-center gap-2 text-pink-300">
                <Brush className="h-4 w-4" />
                <span className="text-sm font-medium">Brush Size: {brushSize}px</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={e => setBrushSize(parseInt(e.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-pink-500"
                disabled={!!previewResult}
              />

              {/* Preview Accept/Reject Buttons */}
              {previewResult ? (
                <div className="space-y-2">
                  <p className="text-center text-xs text-yellow-400">Review the result</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptResult}
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-500"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                    <button
                      onClick={handleRejectResult}
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={clearMask}
                      className="flex-1 rounded bg-white/5 py-2 text-xs text-gray-300 hover:bg-white/10"
                    >
                      Clear Mask
                    </button>
                    <button
                      onClick={handleErase}
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-1 rounded bg-pink-600 py-2 text-xs font-bold text-white hover:bg-pink-500"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Eraser className="h-3 w-3" />
                      )}
                      Erase
                    </button>
                  </div>

                  {/* Undo Button */}
                  <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className={`mt-2 flex w-full items-center justify-center gap-1 rounded py-2 text-xs font-bold ${
                      history.length > 0
                        ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                        : 'cursor-not-allowed bg-white/5 text-gray-500'
                    }`}
                  >
                    <Undo2 className="h-3 w-3" />
                    Undo ({history.length})
                  </button>
                </>
              )}

              <button
                onClick={handleDownload}
                disabled={!!previewResult}
                className={`mt-2 flex w-full items-center justify-center gap-1 rounded py-2 text-xs font-bold text-white ${
                  previewResult
                    ? 'cursor-not-allowed bg-gray-600'
                    : 'bg-green-600 hover:bg-green-500'
                }`}
              >
                <Save className="h-3 w-3" />
                Download Result
              </button>
            </div>
          )}

          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <p className="mb-2 font-medium text-gray-400">How to use:</p>
            <p>1. Upload an image</p>
            <p>2. Paint red over the blemish/tattoo</p>
            <p>3. Click Erase</p>
            <p>4. Accept or Reject the result</p>
            <p>5. Use Undo if needed</p>
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
          {/* Zoom Controls - Fixed Position */}
          {baseImage && (
            <div className="absolute top-2 right-2 z-30 flex items-center gap-1 rounded-lg bg-black/70 p-1 backdrop-blur-sm">
              <Tooltip content="Zoom Out" side="top">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel === ZOOM_LEVELS[0]}
                  className="rounded p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ZoomOut className="h-4 w-4 text-white" />
                </button>
              </Tooltip>
              <Tooltip content="Reset Zoom" side="top">
                <button
                  onClick={handleZoomReset}
                  className="min-w-[50px] rounded px-2 py-1 text-xs text-white hover:bg-white/10"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
              </Tooltip>
              <Tooltip content="Zoom In" side="top">
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                  className="rounded p-1.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ZoomIn className="h-4 w-4 text-white" />
                </button>
              </Tooltip>
              <Tooltip content="Fit to View" side="top">
                <button
                  onClick={handleZoomReset}
                  className="ml-1 rounded border-l border-white/20 p-1.5 hover:bg-white/10"
                >
                  <Maximize2 className="h-4 w-4 text-white" />
                </button>
              </Tooltip>
            </div>
          )}

          {!baseImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              {isLoadingInitial ? (
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-pink-500" />
                  <p className="text-sm text-gray-400">Loading image...</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">Upload image to start editing</p>
              )}
            </div>
          )}

          {displayImageUrl && (
            <div className="inline-block p-4">
              <div
                ref={wrapperRef}
                className={`relative inline-block ${previewResult ? 'cursor-default' : 'cursor-none'}`}
                style={{
                  width: displayDimensions.w > 0 ? displayDimensions.w * zoomLevel : undefined,
                  height: displayDimensions.h > 0 ? displayDimensions.h * zoomLevel : undefined,
                }}
              >
                <img
                  ref={imageRef}
                  src={displayImageUrl || ''}
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
                {/* Canvas overlays the image for drawing mask - hidden during preview */}
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 z-[5] touch-none"
                  style={{
                    width: displayDimensions.w > 0 ? displayDimensions.w * zoomLevel : 0,
                    height: displayDimensions.h > 0 ? displayDimensions.h * zoomLevel : 0,
                    cursor: 'none',
                    pointerEvents: !previewResult && displayDimensions.w > 0 ? 'auto' : 'none',
                    opacity: previewResult ? 0 : 1,
                  }}
                />

                {/* Brush Cursor - always rendered, visibility managed via DOM */}
                <div
                  ref={cursorRef}
                  className="pointer-events-none absolute z-10 rounded-full border-2 border-white bg-pink-500/30"
                  style={{
                    width: brushSize,
                    height: brushSize,
                    display: 'none',
                    boxShadow: '0 0 4px 2px rgba(0,0,0,0.5)',
                  }}
                />

                {/* Preview Indicator */}
                {previewResult && (
                  <div className="absolute top-2 left-2 rounded bg-yellow-500/90 px-2 py-1 text-xs font-bold text-black">
                    PREVIEW - Accept or Reject
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-pink-500" />
                      <span className="text-xs text-white">Removing...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

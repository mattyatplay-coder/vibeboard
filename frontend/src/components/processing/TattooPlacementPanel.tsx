import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Upload,
  Save,
  Layers,
  Eraser,
  Move,
  Grid3X3,
  Sparkles,
  RotateCcw,
  ImageIcon,
  Palette,
  Download,
  Maximize2,
  ScanFace,
  Wand2,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ScrubbableInput } from '@/components/ui/ScrubbableInput';
import { SelectMenu } from '@/components/ui/SelectMenu';
import clsx from 'clsx';

// ============================================================================
// LayerSlot - Professional Layer Panel Component (inline for atomic update)
// ============================================================================
interface LayerSlotProps {
  label: string;
  isActive?: boolean;
  isVisible?: boolean;
  hasFile?: boolean;
  previewUrl?: string;
  onUpload?: () => void;
  onClear?: () => void;
  onSelect?: () => void;
  onToggleVisibility?: () => void;
}

function LayerSlot({
  label,
  isActive,
  isVisible = true,
  hasFile,
  previewUrl,
  onUpload,
  onClear,
  onSelect,
  onToggleVisibility,
}: LayerSlotProps) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group relative flex h-16 w-full cursor-pointer items-center gap-3 overflow-hidden rounded-lg border px-3 transition-all duration-200',
        isActive
          ? 'border-violet-500/50 bg-violet-500/10'
          : 'border-white/5 bg-zinc-900/40 hover:border-white/10 hover:bg-zinc-900/80'
      )}
    >
      {/* Visibility Toggle */}
      <button
        onClick={e => {
          e.stopPropagation();
          onToggleVisibility?.();
        }}
        className={clsx(
          'transition-colors',
          isVisible ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-700 hover:text-zinc-500'
        )}
      >
        {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {/* Thumbnail / Drop Zone */}
      <div
        onClick={e => {
          e.stopPropagation();
          if (!hasFile) onUpload?.();
        }}
        className={clsx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded border transition-all',
          hasFile
            ? 'border-white/10 bg-black'
            : 'border-dashed border-zinc-700 bg-zinc-950 hover:border-zinc-500'
        )}
      >
        {hasFile && previewUrl ? (
          <img src={previewUrl} alt={label} className="h-full w-full rounded-sm object-cover" />
        ) : (
          <Upload size={14} className="text-zinc-600" />
        )}
      </div>

      {/* Label & Status */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span
          className={clsx(
            'truncate text-xs font-medium',
            isActive ? 'text-white' : 'text-zinc-400'
          )}
        >
          {label}
        </span>
        <span
          className={clsx(
            'font-mono text-[10px]',
            hasFile ? 'text-emerald-500/70' : 'text-zinc-600'
          )}
        >
          {hasFile ? 'Ready' : 'Empty'}
        </span>
      </div>

      {/* Clear or Active Indicator */}
      {hasFile ? (
        <button
          onClick={e => {
            e.stopPropagation();
            onClear?.();
          }}
          className="text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
        >
          <X size={14} />
        </button>
      ) : (
        <div
          className={clsx(
            'h-1.5 w-1.5 rounded-full transition-all',
            isActive ? 'bg-violet-500 shadow-[0_0_8px_#8b5cf6]' : 'bg-transparent'
          )}
        />
      )}
    </div>
  );
}

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
    [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 0.5 },
    ],
    [
      { x: 0, y: 1 },
      { x: 0.5, y: 1 },
      { x: 1, y: 1 },
    ],
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

  // Layer management (Phase 4 - Compositor UI)
  const [activeLayer, setActiveLayer] = useState<'skin' | 'design' | 'mask'>('design');
  const [layerVisibility, setLayerVisibility] = useState({ skin: true, design: true, mask: true });
  const [blendMode, setBlendMode] = useState('multiply');
  const [activeTool, setActiveTool] = useState<'move' | 'eraser' | 'wand'>('move');

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

          const posX = offsetX + tattooPos.x * drawWidth - tattooWidth / 2;
          const posY = offsetY + tattooPos.y * drawHeight - tattooHeight / 2;

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
  }, [
    baseImage,
    tattooImageUrl,
    tattooPos,
    tattooScale,
    tattooRotation,
    warpMode,
    cylindricalBend,
    meshPoints,
    baseImageDimensions,
  ]);

  // Draw cylindrical warp effect
  const drawCylindricalWarp = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
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
        x + i * sliceWidth + curveOffset,
        y + yOffset,
        sliceWidth,
        sliceHeight
      );
    }
  };

  // Draw mesh grid for warp mode
  const drawMeshGrid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
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
  const drawHandles = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
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
    const posX = offsetX + tattooPos.x * drawWidth - tattooWidth / 2;
    const posY = offsetY + tattooPos.y * drawHeight - tattooHeight / 2;

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
      const posX = offsetX + tattooPos.x * drawWidth - tattooWidth / 2;
      const posY = offsetY + tattooPos.y * drawHeight - tattooHeight / 2;

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

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'base' | 'tattoo' | 'mask'
  ) => {
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

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/tattoo-composite`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!res.ok) throw new Error('Processing failed');

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (err) {
        console.error(err);
        toast.error('Failed to update preview');
      } finally {
        setIsProcessing(false);
      }
    }, 300);
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (!baseImage || !aiPrompt.trim()) {
      toast.error('Please upload a base image and enter a prompt');
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Convert base image to URL for API
      const formData = new FormData();
      formData.append('base_image', baseImage);
      formData.append('prompt', aiPrompt);
      formData.append('projectId', projectId || '');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/process/tattoo-ai-generate`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!res.ok) throw new Error('AI generation failed');

      const data = await res.json();
      if (data.imageUrl) {
        // Load the generated image as preview
        setPreviewUrl(data.imageUrl);
        toast.success('Tattoo generated with AI!');
      }
    } catch (err) {
      console.error(err);
      toast.error('AI generation failed');
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
    toast.success('Image downloaded');
  };

  const resetTransform = () => {
    setTattooPos({ x: 0.5, y: 0.5 });
    setTattooScale(0.4);
    setTattooRotation(0);
    setMeshPoints([
      [
        { x: 0, y: 0 },
        { x: 0.5, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 0.5 },
      ],
      [
        { x: 0, y: 1 },
        { x: 0.5, y: 1 },
        { x: 1, y: 1 },
      ],
    ]);
    setCylindricalBend(0.3);
  };

  // File input refs for LayerSlot integration
  const baseInputRef = useRef<HTMLInputElement>(null);
  const tattooInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col">
      {/* ================================================================== */}
      {/* 1. COMPOSITOR TOOLBAR - Nuke/After Effects Style                  */}
      {/* ================================================================== */}
      <header className="z-20 flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <ScanFace size={16} className="text-violet-500" />
            <span className="text-sm font-bold text-white">Roto & Paint</span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs">Tattoo Studio</span>
          </div>
        </div>

        {/* Tool Palette (Center) */}
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/90 p-1">
          {[
            { icon: Move, id: 'move' as const, tooltip: 'Move' },
            { icon: Eraser, id: 'eraser' as const, tooltip: 'Eraser' },
            { icon: Wand2, id: 'wand' as const, tooltip: 'AI Enhance' },
          ].map(({ icon: Icon, id, tooltip }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={tooltip}
              className={clsx(
                'rounded-md p-1.5 transition-all',
                activeTool === id
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={!previewUrl}
            className={clsx(
              'flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold transition-all',
              previewUrl
                ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] hover:bg-violet-500'
                : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
            )}
          >
            <Download size={12} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* ================================================================== */}
      {/* 2. MAIN WORKSPACE - 3-Column Layout                               */}
      {/* ================================================================== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---------------------------------------------------------------- */}
        {/* LEFT PANEL: LAYERS                                               */}
        {/* ---------------------------------------------------------------- */}
        <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-white/5 bg-zinc-950/50 p-4">
          <div className="px-1 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Source Layers
          </div>

          {/* Hidden file inputs */}
          <input
            ref={baseInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFileSelect(e, 'base')}
          />
          <input
            ref={tattooInputRef}
            type="file"
            accept="image/png,image/*"
            className="hidden"
            onChange={e => handleFileSelect(e, 'tattoo')}
          />
          <input
            ref={maskInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFileSelect(e, 'mask')}
          />

          <div className="space-y-2">
            <LayerSlot
              label="Base Skin"
              hasFile={!!baseImage}
              previewUrl={baseImage ? URL.createObjectURL(baseImage) : undefined}
              isActive={activeLayer === 'skin'}
              isVisible={layerVisibility.skin}
              onSelect={() => setActiveLayer('skin')}
              onUpload={() => baseInputRef.current?.click()}
              onClear={() => setBaseImage(null)}
              onToggleVisibility={() => setLayerVisibility(v => ({ ...v, skin: !v.skin }))}
            />
            <LayerSlot
              label="Tattoo Design"
              hasFile={!!tattooImage}
              previewUrl={tattooImage ? URL.createObjectURL(tattooImage) : undefined}
              isActive={activeLayer === 'design'}
              isVisible={layerVisibility.design}
              onSelect={() => setActiveLayer('design')}
              onUpload={() => tattooInputRef.current?.click()}
              onClear={() => setTattooImage(null)}
              onToggleVisibility={() => setLayerVisibility(v => ({ ...v, design: !v.design }))}
            />
            <LayerSlot
              label="Alpha Mask"
              hasFile={!!maskImage}
              previewUrl={maskImage ? URL.createObjectURL(maskImage) : undefined}
              isActive={activeLayer === 'mask'}
              isVisible={layerVisibility.mask}
              onSelect={() => setActiveLayer('mask')}
              onUpload={() => maskInputRef.current?.click()}
              onClear={() => setMaskImage(null)}
              onToggleVisibility={() => setLayerVisibility(v => ({ ...v, mask: !v.mask }))}
            />
          </div>

          {/* AI Generator Promo */}
          <div className="mt-auto rounded-lg border border-violet-500/10 bg-violet-500/5 p-3">
            <button
              onClick={() => setShowAIPrompt(!showAIPrompt)}
              className="flex w-full items-center gap-2"
            >
              <Wand2 size={12} className="text-violet-400" />
              <span className="text-xs font-medium text-violet-200">AI Generator</span>
            </button>
            {!showAIPrompt && (
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                Don't have a design? Generate a tribal or geometric pattern instantly.
              </p>
            )}
            {showAIPrompt && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="tribal dragon sleeve..."
                  className="w-full resize-none rounded border border-white/5 bg-black/40 px-2 py-1.5 text-[10px] text-white placeholder-zinc-600"
                  rows={2}
                />
                <button
                  onClick={handleAIGenerate}
                  disabled={isGeneratingAI || !baseImage}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-violet-600 py-1.5 text-[10px] text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" /> Generate
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* CENTER PANEL: CANVAS (80% of screen)                            */}
        {/* ---------------------------------------------------------------- */}
        <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-900">
          {/* Checkerboard Background (Transparency Pattern) */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          />

          {/* The "Artboard" */}
          <div
            ref={containerRef}
            className="relative m-8 h-full max-h-[80vh] w-full max-w-4xl border border-white/5 bg-black shadow-2xl"
          >
            {!baseImage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {isLoadingInitial ? (
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-violet-400" />
                    <p className="text-sm text-zinc-500">Loading...</p>
                  </div>
                ) : (
                  <label className="cursor-pointer text-center">
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5">
                      <Upload className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">Drop image here or click to upload</p>
                    <p className="mt-1 text-xs text-zinc-700">This is your canvas</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileSelect(e, 'base')}
                    />
                  </label>
                )}
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                />

                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="rounded bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/80">
                    <Maximize2 size={14} />
                  </button>
                </div>

                {/* Canvas instructions */}
                {tattooImage && (
                  <div className="absolute top-4 left-4 rounded-lg bg-black/60 px-2.5 py-1.5 text-[10px] text-zinc-400 backdrop-blur-sm">
                    {warpMode === 'mesh' ? (
                      <>
                        <Grid3X3 className="mr-1 inline h-3 w-3 text-violet-400" /> Drag points to
                        warp
                      </>
                    ) : (
                      <>
                        <Move className="mr-1 inline h-3 w-3 text-violet-400" /> Drag to move ·
                        Scroll to scale
                      </>
                    )}
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Floating Info */}
          <div className="absolute bottom-6 flex gap-4 rounded-full border border-white/10 bg-zinc-950/90 px-4 py-1.5 font-mono text-[10px] text-zinc-400">
            <span>ZOOM: 100%</span>
            <span>
              RES:{' '}
              {baseImageDimensions.width > 0
                ? `${baseImageDimensions.width}×${baseImageDimensions.height}`
                : '—'}
            </span>
          </div>
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT PANEL: PROPERTIES INSPECTOR                               */}
        {/* ---------------------------------------------------------------- */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-white/5 bg-zinc-950/50 p-0">
          <div className="border-b border-white/5 p-4">
            <span className="text-xs font-bold text-white">Properties</span>
          </div>

          <div className="space-y-6 p-4">
            {/* Projection/Warp Mode */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Projection Mode
              </span>
              <SegmentedControl
                options={[
                  { value: 'none', label: 'Flat' },
                  { value: 'mesh', label: 'Mesh' },
                  { value: 'cylindrical', label: 'Cyl' },
                ]}
                value={warpMode}
                onChange={val => setWarpMode(val as WarpMode)}
              />

              {warpMode === 'cylindrical' && (
                <div className="mt-2">
                  <ScrubbableInput
                    value={Math.round(cylindricalBend * 100)}
                    onChange={val => setCylindricalBend(val / 100)}
                    min={0}
                    max={100}
                    step={5}
                    unit="%"
                    label="Bend"
                  />
                </div>
              )}
            </div>

            {/* Transform Controls (Scrubbable) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  Transform
                </span>
                <button
                  onClick={resetTransform}
                  className="text-[10px] text-violet-400 hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2">
                <ScrubbableInput
                  value={Math.round(opacity * 100)}
                  onChange={val => setOpacity(val / 100)}
                  min={10}
                  max={100}
                  step={5}
                  unit="%"
                  label="Opacity"
                />
                <ScrubbableInput
                  value={Math.round(tattooScale * 100)}
                  onChange={val => setTattooScale(val / 100)}
                  min={10}
                  max={150}
                  step={5}
                  unit="%"
                  label="Scale"
                />
                <ScrubbableInput
                  value={tattooRotation}
                  onChange={setTattooRotation}
                  min={-180}
                  max={180}
                  step={5}
                  unit="°"
                  label="Rotation"
                />
              </div>
            </div>

            {/* Blending */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Blend Mode
              </span>
              <SelectMenu
                value={blendMode}
                onChange={setBlendMode}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'multiply', label: 'Multiply' },
                  { value: 'overlay', label: 'Overlay' },
                  { value: 'soft-light', label: 'Soft Light' },
                ]}
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Options
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-[10px] text-zinc-400 transition-colors hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={removeBackground}
                  onChange={e => setRemoveBackground(e.target.checked)}
                  className="h-3 w-3 rounded border-white/10 bg-white/5 accent-violet-500"
                />
                <span>Remove white background</span>
              </label>
            </div>
          </div>

          {/* Preview & Generate (Bottom of Inspector) */}
          <div className="mt-auto space-y-3 border-t border-white/5 p-4">
            {/* Mini Preview */}
            {previewUrl ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/5 bg-black/40">
                <img
                  src={previewUrl}
                  className="h-full w-full object-contain"
                  alt="Final Preview"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-white/5 bg-black/20">
                <span className="text-[10px] text-zinc-700">Preview</span>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={updatePreview}
              disabled={isProcessing || !baseImage || !tattooImage}
              className={clsx(
                'flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-medium transition-all',
                baseImage && tattooImage
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500'
                  : 'cursor-not-allowed bg-zinc-800/50 text-zinc-600'
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Composite
                </>
              )}
            </button>

            {/* Status hints */}
            {!baseImage && (
              <p className="text-center text-[10px] text-zinc-600">Upload a base image to start</p>
            )}
            {baseImage && !tattooImage && (
              <p className="text-center text-[10px] text-zinc-600">Add a tattoo design</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

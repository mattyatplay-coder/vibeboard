import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Loader2,
  Upload,
  Expand,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Save,
  Undo2,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';

const MAX_HISTORY = 10;
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5];
const MAX_EXPAND = 700; // Fal.ai max is 700px per direction

interface LensKitMetadata {
  lensName?: string;
  promptModifiers?: string[];
  isAnamorphic?: boolean;
}

interface SetExtensionPanelProps {
  initialImageUrl?: string;
  originalPrompt?: string;
  lensKit?: LensKitMetadata;
  onSave?: (imageUrl: string) => void;
  onClose?: () => void;
}

interface ExpansionValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function SetExtensionPanel({
  initialImageUrl,
  originalPrompt,
  lensKit,
  onSave,
  onClose,
}: SetExtensionPanelProps) {
  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(initialImageUrl || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const initialLoadedRef = useRef(false);
  const [zoomLevel, setZoomLevel] = useState(0.5);

  // Expansion values (in pixels)
  const [expansion, setExpansion] = useState<ExpansionValues>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  // Optional prompt for guiding the outpainting
  const [prompt, setPrompt] = useState('');
  const [zoomOutPercentage, setZoomOutPercentage] = useState(0);

  // Undo history stack
  const [history, setHistory] = useState<string[]>([]);

  // Preview state for accept/reject workflow
  const [previewResult, setPreviewResult] = useState<string | null>(null);

  // Image dimensions for preview
  const [imageDimensions, setImageDimensions] = useState({ width: 512, height: 512 });

  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load initial image from URL
  useEffect(() => {
    if (initialImageUrl && !initialLoadedRef.current) {
      initialLoadedRef.current = true;
      setIsLoadingInitial(true);

      fetch(initialImageUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'initial-image.png', { type: blob.type });
          setBaseImage(file);
          setBaseImageUrl(initialImageUrl);

          // Get image dimensions
          const img = new Image();
          img.onload = () => {
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          };
          img.src = initialImageUrl;
        })
        .catch(err => {
          console.error('Failed to load initial image:', err);
          toast.error('Failed to load image');
        })
        .finally(() => setIsLoadingInitial(false));
    }
  }, [initialImageUrl]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBaseImage(file);
      const url = URL.createObjectURL(file);
      setBaseImageUrl(url);
      setHistory([]);
      setPreviewResult(null);
      setExpansion({ top: 0, bottom: 0, left: 0, right: 0 });

      // Get dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    }
  }, []);

  // Update expansion value
  const updateExpansion = useCallback((direction: keyof ExpansionValues, value: number) => {
    setExpansion(prev => ({
      ...prev,
      [direction]: Math.max(0, Math.min(MAX_EXPAND, value)),
    }));
  }, []);

  // Preset expansion patterns
  const applyPreset = useCallback(
    (
      preset:
        | 'pan-left'
        | 'pan-right'
        | 'pan-up'
        | 'pan-down'
        | 'zoom-out'
        | 'widescreen'
        | 'tallscreen'
    ) => {
      switch (preset) {
        case 'pan-left':
          setExpansion({ top: 0, bottom: 0, left: 400, right: 0 });
          break;
        case 'pan-right':
          setExpansion({ top: 0, bottom: 0, left: 0, right: 400 });
          break;
        case 'pan-up':
          setExpansion({ top: 400, bottom: 0, left: 0, right: 0 });
          break;
        case 'pan-down':
          setExpansion({ top: 0, bottom: 400, left: 0, right: 0 });
          break;
        case 'zoom-out':
          setExpansion({ top: 200, bottom: 200, left: 200, right: 200 });
          setZoomOutPercentage(20);
          break;
        case 'widescreen':
          // Extend to 21:9 from 16:9
          setExpansion({ top: 0, bottom: 0, left: 200, right: 200 });
          break;
        case 'tallscreen':
          // Extend to 9:16 from square
          setExpansion({ top: 300, bottom: 300, left: 0, right: 0 });
          break;
      }
    },
    []
  );

  // Calculate total expansion
  const totalExpansion = expansion.top + expansion.bottom + expansion.left + expansion.right;
  const hasExpansion = totalExpansion > 0;

  // Generate outpainted image
  const handleOutpaint = useCallback(async () => {
    if (!baseImage || !hasExpansion) {
      toast.error('Please select an image and set expansion values');
      return;
    }

    setIsProcessing(true);

    try {
      // First upload the image
      const formData = new FormData();
      formData.append('file', baseImage);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload image');
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.fileUrl || uploadData.url;

      // Call outpaint API with optional Lens Kit metadata for context consistency
      const outpaintRes = await fetch('/api/process/outpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          expand_top: expansion.top,
          expand_bottom: expansion.bottom,
          expand_left: expansion.left,
          expand_right: expansion.right,
          zoom_out_percentage: zoomOutPercentage,
          prompt: prompt || undefined,
          // Context awareness - pass original prompt and lens metadata
          originalPrompt: originalPrompt || undefined,
          lensKit: lensKit || undefined,
        }),
      });

      if (!outpaintRes.ok) {
        const error = await outpaintRes.json();
        throw new Error(error.message || 'Outpainting failed');
      }

      const result = await outpaintRes.json();
      const outputUrl = result.imageUrl || result.url || result.images?.[0]?.url;

      if (outputUrl) {
        setPreviewResult(outputUrl);
        toast.success('Outpainting complete! Review the result.');
      } else {
        throw new Error('No output received');
      }
    } catch (error: any) {
      console.error('Outpaint error:', error);
      toast.error(error.message || 'Outpainting failed');
    } finally {
      setIsProcessing(false);
    }
  }, [baseImage, expansion, zoomOutPercentage, prompt, hasExpansion]);

  // Accept the preview result
  const handleAccept = useCallback(async () => {
    if (!previewResult) return;

    // Push current to history
    if (baseImageUrl) {
      setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), baseImageUrl]);
    }

    // Load the result as new base
    try {
      const res = await fetch(previewResult);
      const blob = await res.blob();
      const file = new File([blob], 'outpainted.png', { type: 'image/png' });
      setBaseImage(file);
      setBaseImageUrl(previewResult);

      // Update dimensions
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previewResult;

      setPreviewResult(null);
      setExpansion({ top: 0, bottom: 0, left: 0, right: 0 });
      toast.success('Result applied - continue expanding or save');
    } catch (err) {
      toast.error('Failed to apply result');
    }
  }, [previewResult, baseImageUrl]);

  // Reject and discard preview
  const handleReject = useCallback(() => {
    setPreviewResult(null);
    toast.info('Result discarded');
  }, []);

  // Undo to previous state
  const handleUndo = useCallback(async () => {
    if (history.length === 0) return;

    const previousUrl = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    try {
      const res = await fetch(previousUrl);
      const blob = await res.blob();
      const file = new File([blob], 'previous.png', { type: 'image/png' });
      setBaseImage(file);
      setBaseImageUrl(previousUrl);

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = previousUrl;

      toast.info('Reverted to previous version');
    } catch (err) {
      toast.error('Failed to undo');
    }
  }, [history]);

  // Save final result
  const handleSave = useCallback(() => {
    if (baseImageUrl && onSave) {
      onSave(baseImageUrl);
      toast.success('Image saved');
    }
  }, [baseImageUrl, onSave]);

  // Zoom controls
  const handleZoomIn = () => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx < ZOOM_LEVELS.length - 1) {
      setZoomLevel(ZOOM_LEVELS[idx + 1]);
    }
  };

  const handleZoomOut = () => {
    const idx = ZOOM_LEVELS.indexOf(zoomLevel);
    if (idx > 0) {
      setZoomLevel(ZOOM_LEVELS[idx - 1]);
    }
  };

  // Calculate preview dimensions
  const previewWidth = imageDimensions.width + expansion.left + expansion.right;
  const previewHeight = imageDimensions.height + expansion.top + expansion.bottom;

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-gray-900 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Expand className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold">Set Extension</h2>
            <span className="text-xs text-gray-400">Infinite Canvas Outpainting</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Tooltip content="Zoom Out" side="top">
              <button
                onClick={handleZoomOut}
                className="rounded p-2 transition-colors hover:bg-white/10"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
            </Tooltip>
            <span className="w-12 text-center text-xs text-gray-400">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Tooltip content="Zoom In" side="top">
              <button
                onClick={handleZoomIn}
                className="rounded p-2 transition-colors hover:bg-white/10"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </Tooltip>

            <div className="mx-2 h-6 w-px bg-white/20" />

            {/* Save/Close */}
            {onSave && (
              <button
                onClick={handleSave}
                disabled={!baseImageUrl || isProcessing}
                className="flex items-center gap-2 rounded bg-green-600 px-3 py-1.5 text-sm font-medium hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="rounded p-2 transition-colors hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Canvas Area */}
          <div
            ref={containerRef}
            className="flex flex-1 items-center justify-center overflow-auto bg-gray-950 p-8"
          >
            {isLoadingInitial ? (
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span>Loading image...</span>
              </div>
            ) : !baseImageUrl ? (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-600 p-12 transition-colors hover:border-cyan-500">
                  <Upload className="h-12 w-12 text-gray-500" />
                  <span className="text-gray-400">Upload an image to extend</span>
                </div>
              </label>
            ) : (
              <div
                className="relative"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                }}
              >
                {/* Preview container showing expansion zones */}
                <div
                  className="relative border-2 border-dashed border-cyan-500/50"
                  style={{
                    width: previewWidth,
                    height: previewHeight,
                  }}
                >
                  {/* Top expansion zone */}
                  {expansion.top > 0 && (
                    <div
                      className="absolute top-0 right-0 left-0 flex items-center justify-center border-b border-cyan-500/30 bg-cyan-900/20"
                      style={{
                        height: expansion.top,
                        marginLeft: expansion.left,
                        marginRight: expansion.right,
                      }}
                    >
                      <span className="text-xs text-cyan-400">+{expansion.top}px</span>
                    </div>
                  )}

                  {/* Bottom expansion zone */}
                  {expansion.bottom > 0 && (
                    <div
                      className="absolute right-0 bottom-0 left-0 flex items-center justify-center border-t border-cyan-500/30 bg-cyan-900/20"
                      style={{
                        height: expansion.bottom,
                        marginLeft: expansion.left,
                        marginRight: expansion.right,
                      }}
                    >
                      <span className="text-xs text-cyan-400">+{expansion.bottom}px</span>
                    </div>
                  )}

                  {/* Left expansion zone */}
                  {expansion.left > 0 && (
                    <div
                      className="absolute top-0 bottom-0 left-0 flex items-center justify-center border-r border-purple-500/30 bg-purple-900/20"
                      style={{ width: expansion.left }}
                    >
                      <span className="rotate-90 text-xs text-purple-400">+{expansion.left}px</span>
                    </div>
                  )}

                  {/* Right expansion zone */}
                  {expansion.right > 0 && (
                    <div
                      className="absolute top-0 right-0 bottom-0 flex items-center justify-center border-l border-purple-500/30 bg-purple-900/20"
                      style={{ width: expansion.right }}
                    >
                      <span className="rotate-90 text-xs text-purple-400">
                        +{expansion.right}px
                      </span>
                    </div>
                  )}

                  {/* Original image (or preview result) */}
                  <div
                    className="absolute"
                    style={{
                      top: expansion.top,
                      left: expansion.left,
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                    }}
                  >
                    <img
                      src={previewResult || baseImageUrl}
                      alt="Source"
                      className="h-full w-full object-contain"
                      style={{
                        filter: previewResult ? 'none' : undefined,
                      }}
                    />
                  </div>
                </div>

                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <span className="text-sm text-gray-300">Extending canvas...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Controls */}
          <div className="w-72 overflow-y-auto border-l border-white/10">
            <div className="space-y-6 p-4">
              {/* Quick Presets */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">Quick Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyPreset('pan-left')}
                    className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    <ArrowLeft className="h-3 w-3" /> Pan Left
                  </button>
                  <button
                    onClick={() => applyPreset('pan-right')}
                    className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    <ArrowRight className="h-3 w-3" /> Pan Right
                  </button>
                  <button
                    onClick={() => applyPreset('pan-up')}
                    className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    <ArrowUp className="h-3 w-3" /> Pan Up
                  </button>
                  <button
                    onClick={() => applyPreset('pan-down')}
                    className="flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    <ArrowDown className="h-3 w-3" /> Pan Down
                  </button>
                  <button
                    onClick={() => applyPreset('zoom-out')}
                    className="col-span-2 flex items-center gap-2 rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    <Maximize2 className="h-3 w-3" /> Zoom Out (All Sides)
                  </button>
                  <button
                    onClick={() => applyPreset('widescreen')}
                    className="rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    → 21:9 Wide
                  </button>
                  <button
                    onClick={() => applyPreset('tallscreen')}
                    className="rounded bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                  >
                    ↕ 9:16 Tall
                  </button>
                </div>
              </div>

              {/* Manual Expansion Controls */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-gray-300">Expansion (px)</h3>
                <div className="space-y-3">
                  {/* Top */}
                  <div className="flex items-center gap-3">
                    <ArrowUp className="h-4 w-4 text-cyan-400" />
                    <span className="w-12 text-xs text-gray-400">Top</span>
                    <input
                      type="range"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.top}
                      onChange={e => updateExpansion('top', parseInt(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.top}
                      onChange={e => updateExpansion('top', parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-xs"
                    />
                  </div>

                  {/* Bottom */}
                  <div className="flex items-center gap-3">
                    <ArrowDown className="h-4 w-4 text-cyan-400" />
                    <span className="w-12 text-xs text-gray-400">Bottom</span>
                    <input
                      type="range"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.bottom}
                      onChange={e => updateExpansion('bottom', parseInt(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.bottom}
                      onChange={e => updateExpansion('bottom', parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-xs"
                    />
                  </div>

                  {/* Left */}
                  <div className="flex items-center gap-3">
                    <ArrowLeft className="h-4 w-4 text-purple-400" />
                    <span className="w-12 text-xs text-gray-400">Left</span>
                    <input
                      type="range"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.left}
                      onChange={e => updateExpansion('left', parseInt(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.left}
                      onChange={e => updateExpansion('left', parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-xs"
                    />
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3">
                    <ArrowRight className="h-4 w-4 text-purple-400" />
                    <span className="w-12 text-xs text-gray-400">Right</span>
                    <input
                      type="range"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.right}
                      onChange={e => updateExpansion('right', parseInt(e.target.value))}
                      className="flex-1 accent-purple-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max={MAX_EXPAND}
                      value={expansion.right}
                      onChange={e => updateExpansion('right', parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-xs"
                    />
                  </div>
                </div>

                {/* Reset button */}
                <button
                  onClick={() => setExpansion({ top: 0, bottom: 0, left: 0, right: 0 })}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Zoom Out Percentage */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">Zoom Out</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={zoomOutPercentage}
                    onChange={e => setZoomOutPercentage(parseInt(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <span className="w-10 text-right text-xs text-gray-400">
                    {zoomOutPercentage}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Scales image down, filling edges with generated content
                </p>
              </div>

              {/* Optional Prompt */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-300">
                  Guidance Prompt (Optional)
                </h3>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value.slice(0, 500))}
                  placeholder="e.g., with a beautiful sunset in the background"
                  className="h-20 w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-gray-500"
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-500">{prompt.length}/500 characters</p>
              </div>

              {/* Result Info */}
              {hasExpansion && (
                <div className="rounded border border-cyan-500/20 bg-cyan-950/30 p-3">
                  <h4 className="mb-2 text-xs font-medium text-cyan-400">Output Preview</h4>
                  <p className="text-xs text-gray-400">
                    {imageDimensions.width}×{imageDimensions.height} → {previewWidth}×
                    {previewHeight}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    ~${(((previewWidth * previewHeight) / 1000000) * 0.035).toFixed(3)} estimated
                    cost
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {previewResult ? (
                  <>
                    <button
                      onClick={handleAccept}
                      className="flex w-full items-center justify-center gap-2 rounded bg-green-600 px-4 py-2.5 font-medium hover:bg-green-500"
                    >
                      <Check className="h-4 w-4" /> Accept & Continue
                    </button>
                    <button
                      onClick={handleReject}
                      className="flex w-full items-center justify-center gap-2 rounded bg-red-600/20 px-4 py-2.5 font-medium text-red-400 hover:bg-red-600/30"
                    >
                      <X className="h-4 w-4" /> Discard
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleOutpaint}
                    disabled={!baseImageUrl || !hasExpansion || isProcessing}
                    className="flex w-full items-center justify-center gap-2 rounded bg-cyan-600 px-4 py-2.5 font-medium hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Extending...
                      </>
                    ) : (
                      <>
                        <Expand className="h-4 w-4" /> Extend Canvas
                      </>
                    )}
                  </button>
                )}

                {/* Undo */}
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0 || isProcessing}
                  className="flex w-full items-center justify-center gap-2 rounded bg-white/5 px-4 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Undo2 className="h-4 w-4" /> Undo ({history.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default SetExtensionPanel;

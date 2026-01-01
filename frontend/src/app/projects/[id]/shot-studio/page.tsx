'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Play,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Film,
  Box,
  Wand2,
  RotateCcw,
  Download,
  Copy,
  ChevronDown,
  PenTool,
  MousePointer2,
} from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { ShotStudioControls, BlockingRegion } from '@/components/shot-studio';
import { Tooltip } from '@/components/ui/Tooltip';

interface GenerationResult {
  id: string;
  url: string;
  type: 'image' | 'video';
  prompt: string;
  model: string;
  timestamp: Date;
}

const REGION_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export default function ShotStudioPage() {
  const params = useParams();
  const projectId = params.id as string;

  // Generation State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Shot Studio State
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [blockingRegions, setBlockingRegions] = useState<BlockingRegion[]>([]);

  // Generation Options
  const [mode, setMode] = useState<'text_to_image' | 'text_to_video'>('text_to_image');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(5);

  // Preview Canvas Ref (for ReCo box overlay)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Drawing state for interactive ReCo region creation
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Draw blocking regions on canvas
  const drawBlockingRegions = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to preview
    const rect = preview.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each region
    blockingRegions.forEach((region) => {
      const [xPct, yPct, widthPct, heightPct] = region.box;
      const x = (xPct / 100) * canvas.width;
      const y = (yPct / 100) * canvas.height;
      const width = (widthPct / 100) * canvas.width;
      const height = (heightPct / 100) * canvas.height;

      // Draw semi-transparent fill
      ctx.fillStyle = region.color + '30';
      ctx.fillRect(x, y, width, height);

      // Draw border
      ctx.strokeStyle = region.color;
      ctx.lineWidth = 2;
      ctx.setLineDash(region.locked ? [] : [5, 5]);
      ctx.strokeRect(x, y, width, height);

      // Draw label
      ctx.fillStyle = region.color;
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(region.label, x + 4, y + 16);
    });

    // Draw current drawing preview
    if (currentDraw) {
      const nextColor = REGION_COLORS[blockingRegions.length % REGION_COLORS.length];
      ctx.fillStyle = nextColor + '30';
      ctx.fillRect(currentDraw.x, currentDraw.y, currentDraw.w, currentDraw.h);
      ctx.strokeStyle = nextColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentDraw.x, currentDraw.y, currentDraw.w, currentDraw.h);
    }
  }, [blockingRegions, currentDraw]);

  // Redraw regions when they change
  useEffect(() => {
    drawBlockingRegions();
    window.addEventListener('resize', drawBlockingRegions);
    return () => window.removeEventListener('resize', drawBlockingRegions);
  }, [drawBlockingRegions]);

  // Keyboard shortcuts for draw mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'd' || e.key === 'D') {
        setIsDrawMode(true);
      } else if (e.key === 'Escape') {
        setIsDrawMode(false);
        setIsDrawing(false);
        setDrawStart(null);
        setCurrentDraw(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get mouse position relative to canvas as percentage
  const getCanvasPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  // Handle mouse down - start drawing
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawMode) return;
    const pos = getCanvasPosition(e);
    if (!pos) return;

    setIsDrawing(true);
    setDrawStart({ x: pos.x, y: pos.y });
    setCurrentDraw({ x: pos.x, y: pos.y, w: 0, h: 0 });
  }, [isDrawMode, getCanvasPosition]);

  // Handle mouse move - update drawing preview
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    const pos = getCanvasPosition(e);
    if (!pos) return;

    // Calculate box dimensions (support drawing in any direction)
    const x = Math.min(drawStart.x, pos.x);
    const y = Math.min(drawStart.y, pos.y);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);

    setCurrentDraw({ x, y, w, h });
  }, [isDrawing, drawStart, getCanvasPosition]);

  // Handle mouse up - finish drawing and create region
  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentDraw) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDraw(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to percentages
    const xPct = (currentDraw.x / canvas.width) * 100;
    const yPct = (currentDraw.y / canvas.height) * 100;
    const wPct = (currentDraw.w / canvas.width) * 100;
    const hPct = (currentDraw.h / canvas.height) * 100;

    // Minimum size check (at least 5% in each dimension)
    if (wPct >= 5 && hPct >= 5) {
      const newRegion: BlockingRegion = {
        id: `region-${Date.now()}`,
        label: `Object ${blockingRegions.length + 1}`,
        prompt: '',
        box: [xPct, yPct, wPct, hPct],
        locked: false,
        color: REGION_COLORS[blockingRegions.length % REGION_COLORS.length],
      };
      setBlockingRegions((prev) => [...prev, newRegion]);
    }

    // Reset drawing state
    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
  }, [isDrawing, currentDraw, blockingRegions]);

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetchAPI(`/projects/${projectId}/shot-studio/generate`, {
        method: 'POST',
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          selectedLocationId,
          blockingRegions: blockingRegions.length > 0 ? blockingRegions : undefined,
          mode,
          aspectRatio,
          duration: mode === 'text_to_video' ? duration : undefined,
        }),
      });

      if (response.success && response.generation) {
        const newResult: GenerationResult = {
          id: response.generation.id,
          url: response.generation.outputUrl || response.generation.outputs?.[0]?.url || '',
          type: mode === 'text_to_video' ? 'video' : 'image',
          prompt: prompt,
          model: response.generation.model || 'Unknown',
          timestamp: new Date(),
        };

        setResults((prev) => [newResult, ...prev]);
      } else {
        setError(response.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine engine mode label
  const getEngineModeLabel = () => {
    if (selectedLocationId && blockingRegions.length > 0) {
      return 'Spatia + ReCo';
    } else if (selectedLocationId) {
      return 'Spatia (3D)';
    } else if (blockingRegions.length > 0) {
      return 'ReCo (Compositional)';
    }
    return 'Standard';
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Controls */}
      <div className="w-[400px] shrink-0 overflow-y-auto border-r border-white/10 bg-zinc-950 p-6">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Shot Studio</h1>

        {/* Shot Studio Controls */}
        <ShotStudioControls
          projectId={projectId}
          onLocationSelect={setSelectedLocationId}
          onBlockingUpdate={setBlockingRegions}
          selectedLocationId={selectedLocationId}
          className="mb-6"
        />

        {/* Prompt Input */}
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your shot..."
              rows={4}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Negative Prompt
            </label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="What to avoid..."
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-900 p-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none"
            />
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('text_to_image')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors',
                mode === 'text_to_image'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-white/10 text-gray-400 hover:bg-white/5'
              )}
            >
              <ImageIcon className="h-4 w-4" />
              Image
            </button>
            <button
              onClick={() => setMode('text_to_video')}
              className={clsx(
                'flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors',
                mode === 'text_to_video'
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-white/10 text-gray-400 hover:bg-white/5'
              )}
            >
              <Film className="h-4 w-4" />
              Video
            </button>
          </div>

          {/* Options Row */}
          <div className="flex gap-2">
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:3">4:3 (Classic)</option>
              <option value="21:9">21:9 (Anamorphic)</option>
            </select>

            {mode === 'text_to_video' && (
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-24 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value={3}>3 sec</option>
                <option value={5}>5 sec</option>
                <option value={8}>8 sec</option>
                <option value={10}>10 sec</option>
              </select>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={clsx(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all',
              isGenerating || !prompt.trim()
                ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate ({getEngineModeLabel()})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Preview & Results */}
      <div className="flex flex-1 flex-col overflow-hidden bg-zinc-900">
        {/* Preview Area */}
        <div className="relative flex-1 p-6">
          <div
            ref={previewRef}
            className="relative mx-auto aspect-video max-h-full w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black"
          >
            {/* Latest Result or Placeholder */}
            {results.length > 0 ? (
              results[0].type === 'video' ? (
                <video
                  src={results[0].url}
                  className="h-full w-full object-contain"
                  controls
                  autoPlay
                  loop
                  muted
                />
              ) : (
                <img
                  src={results[0].url}
                  alt="Latest generation"
                  className="h-full w-full object-contain"
                />
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-gray-600">
                <Box className="mb-4 h-16 w-16" />
                <p className="text-lg font-medium">Shot Studio Preview</p>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLocationId
                    ? 'Location locked - 3D-aware generation enabled'
                    : blockingRegions.length > 0
                      ? 'Compositional control active'
                      : 'Select a virtual set or add blocking regions'}
                </p>
              </div>
            )}

            {/* ReCo Overlay Canvas - Interactive when in draw mode */}
            <canvas
              ref={canvasRef}
              className={clsx(
                'absolute inset-0',
                isDrawMode ? 'cursor-crosshair' : 'pointer-events-none'
              )}
              style={{ mixBlendMode: 'normal' }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                if (isDrawing) {
                  setIsDrawing(false);
                  setDrawStart(null);
                  setCurrentDraw(null);
                }
              }}
            />

            {/* Draw Mode Toggle Button */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              <Tooltip content={isDrawMode ? 'Exit Draw Mode (Esc)' : 'Draw Region (D)'}>
                <button
                  onClick={() => setIsDrawMode(!isDrawMode)}
                  className={clsx(
                    'rounded-lg p-2 transition-all',
                    isDrawMode
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-black/50 text-gray-400 hover:bg-black/70 hover:text-white'
                  )}
                >
                  {isDrawMode ? <MousePointer2 className="h-5 w-5" /> : <PenTool className="h-5 w-5" />}
                </button>
              </Tooltip>
            </div>

            {/* Draw Mode Hint */}
            {isDrawMode && !isDrawing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-purple-500/90 px-4 py-2 text-sm font-medium text-white"
              >
                Click and drag to draw a region
              </motion.div>
            )}

            {/* Generating Overlay */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <div className="text-center">
                  <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-400" />
                  <p className="text-lg font-medium text-white">Generating with {getEngineModeLabel()}</p>
                  <p className="mt-1 text-sm text-gray-400">This may take a moment...</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Results Gallery */}
        {results.length > 0 && (
          <div className="border-t border-white/10 bg-zinc-950 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-400">Recent Generations</h3>
              <button
                onClick={() => setResults([])}
                className="text-xs text-gray-500 hover:text-white"
              >
                Clear All
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={clsx(
                    'group relative h-20 w-32 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all',
                    index === 0
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : 'border-white/10 hover:border-white/20'
                  )}
                  onClick={() => {
                    // Move to top
                    setResults((prev) => [result, ...prev.filter((r) => r.id !== result.id)]);
                  }}
                >
                  {result.type === 'video' ? (
                    <video src={result.url} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={result.url} alt="" className="h-full w-full object-cover" />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Tooltip content="Download">
                      <a
                        href={result.url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </Tooltip>
                    <Tooltip content="Copy URL">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(result.url);
                        }}
                        className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Type indicator */}
                  <div className="absolute bottom-1 left-1">
                    {result.type === 'video' ? (
                      <Film className="h-3 w-3 text-purple-400" />
                    ) : (
                      <ImageIcon className="h-3 w-3 text-blue-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

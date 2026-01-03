'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Sparkles,
  Type,
  Palette,
  Copy,
  Download,
  RefreshCw,
  X,
  ChevronDown,
  Loader2,
  Wand2,
  LayoutGrid,
} from 'lucide-react';
import clsx from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ThumbnailResult {
  thumbnailUrl: string;
  textOverlay: {
    primary: string;
    secondary?: string;
    position: string;
  };
  variants?: Array<{
    url: string;
    style: string;
    textOverlay: { primary: string; secondary?: string; position?: string };
  }>;
  prompt: string;
  appliedStyle: string;
}

interface ThumbnailGeneratorPanelProps {
  projectId: string;
  videoTitle: string;
  videoDescription?: string;
  archetype: string;
  genre: 'youtuber' | 'onlyfans';
  referenceImageUrl?: string;
  isOpen: boolean;
  onClose: () => void;
  onThumbnailGenerated?: (result: ThumbnailResult) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT OVERLAY POSITIONS
// ═══════════════════════════════════════════════════════════════════════════

const TEXT_POSITIONS = [
  { id: 'top-left', label: 'Top Left', className: 'top-2 left-2' },
  { id: 'top-right', label: 'Top Right', className: 'top-2 right-2' },
  { id: 'bottom-left', label: 'Bottom Left', className: 'bottom-2 left-2' },
  { id: 'bottom-right', label: 'Bottom Right', className: 'bottom-2 right-2' },
  {
    id: 'center',
    label: 'Center',
    className: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ThumbnailGeneratorPanel: React.FC<ThumbnailGeneratorPanelProps> = ({
  projectId,
  videoTitle,
  videoDescription = '',
  archetype,
  genre,
  referenceImageUrl,
  isOpen,
  onClose,
  onThumbnailGenerated,
}) => {
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ThumbnailResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number>(-1); // -1 = primary
  const [generateVariants, setGenerateVariants] = useState(true);
  const [variantCount, setVariantCount] = useState(3);
  const [customStyle, setCustomStyle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get current thumbnail URL
  const currentThumbnail =
    selectedVariant === -1 ? result?.thumbnailUrl : result?.variants?.[selectedVariant]?.url;

  // Get current text overlay
  const currentTextOverlay =
    selectedVariant === -1 ? result?.textOverlay : result?.variants?.[selectedVariant]?.textOverlay;

  /**
   * Generate thumbnail
   */
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/creator/generate-thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          videoTitle,
          videoDescription,
          archetype,
          genre,
          referenceImageUrl,
          generateVariants,
          variantCount,
          customStyle: customStyle || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate thumbnail');
      }

      const data = await response.json();
      setResult(data.thumbnail);
      setSelectedVariant(-1);

      if (onThumbnailGenerated) {
        onThumbnailGenerated(data.thumbnail);
      }
    } catch (err) {
      console.error('Thumbnail generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
    } finally {
      setIsGenerating(false);
    }
  }, [
    projectId,
    videoTitle,
    videoDescription,
    archetype,
    genre,
    referenceImageUrl,
    generateVariants,
    variantCount,
    customStyle,
    onThumbnailGenerated,
  ]);

  /**
   * Download current thumbnail
   */
  const handleDownload = useCallback(async () => {
    if (!currentThumbnail) return;

    try {
      const response = await fetch(currentThumbnail);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail_${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  }, [currentThumbnail]);

  /**
   * Copy thumbnail URL
   */
  const handleCopyUrl = useCallback(() => {
    if (!currentThumbnail) return;
    navigator.clipboard.writeText(currentThumbnail);
  }, [currentThumbnail]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  genre === 'onlyfans' ? 'bg-red-500/20' : 'bg-purple-500/20'
                )}
              >
                <Image
                  className={clsx(
                    'h-5 w-5',
                    genre === 'onlyfans' ? 'text-red-400' : 'text-purple-400'
                  )}
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Thumbnail Generator</h2>
                <p className="text-xs text-zinc-500">
                  AI-optimized thumbnails for{' '}
                  {genre === 'onlyfans' ? 'exclusive content' : 'YouTube'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-80px)]">
            {/* Left: Preview */}
            <div className="flex-1 overflow-y-auto border-r border-zinc-800 p-6">
              {/* Main Preview */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                {currentThumbnail ? (
                  <>
                    <img
                      src={currentThumbnail}
                      alt="Generated thumbnail"
                      className="h-full w-full object-cover"
                    />
                    {/* Text Overlay Preview */}
                    {currentTextOverlay && (
                      <div
                        className={clsx(
                          'absolute px-4 py-2',
                          TEXT_POSITIONS.find(p => p.id === currentTextOverlay.position)?.className
                        )}
                      >
                        <div className="rounded-lg bg-black/70 px-4 py-2 backdrop-blur-sm">
                          <div className="text-xl font-black text-white uppercase drop-shadow-lg">
                            {currentTextOverlay.primary}
                          </div>
                          {currentTextOverlay.secondary && (
                            <div className="text-sm text-white/80">
                              {currentTextOverlay.secondary}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : isGenerating ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    <span className="text-sm text-zinc-500">Generating thumbnail...</span>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <Image className="h-12 w-12 text-zinc-700" />
                    <span className="text-sm text-zinc-500">
                      Click Generate to create thumbnail
                    </span>
                  </div>
                )}
              </div>

              {/* Variant Selector */}
              {result?.variants && result.variants.length > 0 && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    <LayoutGrid className="mr-1 inline h-3 w-3" />
                    A/B Variants
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {/* Primary */}
                    <button
                      onClick={() => setSelectedVariant(-1)}
                      className={clsx(
                        'relative shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                        selectedVariant === -1
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : 'border-zinc-700 hover:border-zinc-600'
                      )}
                    >
                      <img
                        src={result.thumbnailUrl}
                        alt="Primary"
                        className="h-16 w-28 object-cover"
                      />
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Primary
                      </span>
                    </button>

                    {/* Variants */}
                    {result.variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariant(index)}
                        className={clsx(
                          'relative shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                          selectedVariant === index
                            ? 'border-purple-500 ring-2 ring-purple-500/30'
                            : 'border-zinc-700 hover:border-zinc-600'
                        )}
                      >
                        <img
                          src={variant.url}
                          alt={variant.style}
                          className="h-16 w-28 object-cover"
                        />
                        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {variant.style}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {currentThumbnail && (
                <div className="mt-4 flex gap-2">
                  <Tooltip content="Download thumbnail">
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </Tooltip>
                  <Tooltip content="Copy image URL">
                    <button
                      onClick={handleCopyUrl}
                      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
                    >
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </button>
                  </Tooltip>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="w-80 overflow-y-auto p-6">
              {/* Video Info */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Video Title
                </label>
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm text-white">
                  {videoTitle || 'Untitled Video'}
                </div>
              </div>

              {/* Archetype Badge */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  Style
                </label>
                <div
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                    genre === 'onlyfans'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-purple-500/20 text-purple-300'
                  )}
                >
                  <Palette className="h-4 w-4" />
                  {archetype.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </div>
              </div>

              {/* Custom Style Override */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                  <Wand2 className="mr-1 inline h-3 w-3" />
                  Custom Style (Optional)
                </label>
                <textarea
                  value={customStyle}
                  onChange={e => setCustomStyle(e.target.value)}
                  placeholder="e.g., neon colors, dramatic shadows, comic book style..."
                  className="h-20 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* A/B Variants Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    Generate A/B Variants
                  </label>
                  <button
                    onClick={() => setGenerateVariants(!generateVariants)}
                    className={clsx(
                      'relative h-6 w-10 rounded-full transition-colors',
                      generateVariants ? 'bg-purple-500' : 'bg-zinc-700'
                    )}
                  >
                    <div
                      className={clsx(
                        'absolute top-1 h-4 w-4 rounded-full bg-white transition-all',
                        generateVariants ? 'left-5' : 'left-1'
                      )}
                    />
                  </button>
                </div>

                {generateVariants && (
                  <div className="mt-3">
                    <label className="mb-1 block text-[10px] text-zinc-500">
                      Number of variants
                    </label>
                    <select
                      value={variantCount}
                      onChange={e => setVariantCount(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm text-white"
                    >
                      <option value={2}>2 variants</option>
                      <option value={3}>3 variants</option>
                      <option value={4}>4 variants</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={clsx(
                  'flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white transition-all',
                  isGenerating
                    ? 'cursor-not-allowed bg-zinc-700'
                    : genre === 'onlyfans'
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {result ? 'Regenerate' : 'Generate Thumbnail'}
                  </>
                )}
              </button>

              {/* Text Overlay Info */}
              {currentTextOverlay && (
                <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <label className="mb-2 block text-xs font-bold tracking-wider text-zinc-500 uppercase">
                    <Type className="mr-1 inline h-3 w-3" />
                    Suggested Text Overlay
                  </label>
                  <div className="space-y-2 text-sm">
                    <div className="font-bold text-white">{currentTextOverlay.primary}</div>
                    {currentTextOverlay.secondary && (
                      <div className="text-zinc-400">{currentTextOverlay.secondary}</div>
                    )}
                    <div className="text-xs text-zinc-500">
                      Position: {currentTextOverlay.position}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ThumbnailGeneratorPanel;

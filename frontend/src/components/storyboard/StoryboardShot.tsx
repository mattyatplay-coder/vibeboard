'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Upload,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  Video,
  ChevronDown,
  Image as ImageIcon,
  RefreshCcw,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { usePromptWeighting } from '@/hooks/usePromptWeighting';
import { usePromptAutocomplete } from '@/hooks/usePromptAutocomplete';
import { AutocompletePopup } from '@/components/prompts/AutocompletePopup';
import { BACKEND_URL } from '@/lib/api';
import { MODEL_PRICING, formatCost } from '@/lib/ModelPricing';

// Helper to resolve relative URLs from backend to full URLs
function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface ElementData {
  id: string;
  name: string;
  type?: string;
  url?: string;
  fileUrl?: string;
  thumbnail?: string;
  projectId?: string;
}

// Popular image models for frame generation
const IMAGE_MODELS = [
  { id: 'fal-ai/flux/dev', name: 'FLUX Dev', desc: 'High quality, LoRA support' },
  { id: 'fal-ai/flux/schnell', name: 'FLUX Schnell', desc: 'Fast iteration' },
  { id: 'fal-ai/flux-pro', name: 'FLUX Pro', desc: 'Best prompt adherence' },
  { id: 'fal-ai/flux-pro/v1.1-ultra', name: 'FLUX Ultra', desc: '4MP high-res' },
  { id: 'fal-ai/ideogram/v2', name: 'Ideogram v2', desc: 'Great typography' },
  { id: 'fal-ai/recraft-v3', name: 'Recraft v3', desc: 'Design & illustration' },
  { id: 'google/imagen-4', name: 'Imagen 4', desc: 'Google photorealism' },
  { id: 'fal-ai/stable-diffusion-v35-large', name: 'SD 3.5 Large', desc: 'Open source' },
];

// Video resolution options by model family
const VIDEO_RESOLUTION_MAP: Record<string, { id: string; label: string }[]> = {
  'kling': [
    { id: '480p', label: '480p' },
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'wan': [
    { id: '480p', label: '480p' },
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'luma': [
    { id: '540p', label: '540p' },
    { id: '720p', label: '720p' },
  ],
  'minimax': [
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'vidu': [
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'ltx': [
    { id: '480p', label: '480p' },
    { id: '720p', label: '720p' },
  ],
  'hunyuan': [
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'pixverse': [
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
  'default': [
    { id: '480p', label: '480p' },
    { id: '720p', label: '720p' },
    { id: '1080p', label: '1080p' },
  ],
};

// Helper to get available resolutions based on video model
function getVideoResolutions(videoModel: string | null | undefined) {
  const model = videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video';
  const modelLower = model.toLowerCase();
  for (const [key, resolutions] of Object.entries(VIDEO_RESOLUTION_MAP)) {
    if (key !== 'default' && modelLower.includes(key)) {
      return resolutions;
    }
  }
  return VIDEO_RESOLUTION_MAP.default;
}

// Resolution multipliers for pricing (base price is for 720p)
const RESOLUTION_MULTIPLIERS: Record<string, number> = {
  '480p': 0.7,
  '540p': 0.8,
  '720p': 1.0,
  '1080p': 1.5,
};

// Resolution to megapixels mapping (standard dimensions, rounded up)
// Based on: MP = (width × height) / 1,000,000, then ceil()
const RESOLUTION_MEGAPIXELS: Record<string, number> = {
  '480p': 1,   // 854×480 = 0.41 MP → rounds to 1 MP
  '540p': 1,   // 960×540 = 0.52 MP → rounds to 1 MP
  '720p': 1,   // 1280×720 = 0.92 MP → rounds to 1 MP
  '1080p': 3,  // 1920×1080 = 2.07 MP → rounds to 3 MP
  '4k': 9,     // 3840×2160 = 8.29 MP → rounds to 9 MP
};

// Image resolution options (for frame generation)
const IMAGE_RESOLUTIONS = [
  { id: '720p', label: '720p', desc: '~1 MP' },
  { id: '1080p', label: '1080p', desc: '~3 MP' },
  { id: '4k', label: '4K', desc: '~9 MP' },
];

// Raw numeric image cost calculation (for totals)
export function calculateImageCost(
  imageModel: string | null | undefined,
  resolution: string | null | undefined
): number {
  const model = imageModel || 'fal-ai/flux/dev';
  const res = resolution || '720p';
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    return 0.03; // Default estimate
  }

  // If model has free pricing
  if (pricing.free) {
    return 0;
  }

  // Get megapixels for the resolution
  const megapixels = RESOLUTION_MEGAPIXELS[res] || 1;

  // Calculate cost based on pricing type
  if (pricing.perMegapixel) {
    return pricing.perMegapixel * megapixels;
  } else if (pricing.perImage) {
    // Flux Dev is $0.025 per MP according to user
    if (model.includes('flux') && model.includes('dev')) {
      return pricing.perImage * megapixels;
    }
    return pricing.perImage;
  }

  return 0.03;
}

// Helper to estimate image generation cost based on megapixels
function estimateImageCost(
  imageModel: string | null | undefined,
  resolution: string | null | undefined
): string {
  const cost = calculateImageCost(imageModel, resolution);
  if (cost === 0) return 'Free';
  return formatCost(cost);
}

// Helper to estimate video generation cost
function estimateVideoCost(
  videoModel: string | null | undefined,
  resolution: string | null | undefined,
  durationSeconds: number
): string {
  return formatCost(calculateVideoCost(videoModel, resolution, durationSeconds));
}

// Raw numeric video cost calculation (for totals)
export function calculateVideoCost(
  videoModel: string | null | undefined,
  resolution: string | null | undefined,
  durationSeconds: number
): number {
  const model = videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video';
  const res = resolution || '720p';
  const pricing = MODEL_PRICING[model];

  if (!pricing || !pricing.perSecond) {
    return 0.50; // Default estimate
  }

  const basePrice = pricing.basePrice || 0;
  const perSecond = pricing.perSecond;
  const multiplier = RESOLUTION_MULTIPLIERS[res] || 1.0;

  return basePrice + (perSecond * durationSeconds * multiplier);
}

// Calculate total shot cost including all iterations
export function calculateTotalShotCost(shot: ShotData): {
  imageCost: number;
  videoCost: number;
  total: number;
  imageIterations: number;
  videoIterations: number;
} {
  const firstFrameIters = shot.firstFrameIterations || 0;
  const lastFrameIters = shot.lastFrameIterations || 0;
  const videoIters = shot.videoIterations || 0;

  const costPerFrame = calculateImageCost(shot.imageModel, shot.imageResolution);
  const costPerVideo = calculateVideoCost(shot.videoModel, shot.videoResolution, shot.duration || 5);

  const imageCost = (firstFrameIters + lastFrameIters) * costPerFrame;
  const videoCost = videoIters * costPerVideo;

  return {
    imageCost,
    videoCost,
    total: imageCost + videoCost,
    imageIterations: firstFrameIters + lastFrameIters,
    videoIterations: videoIters,
  };
}

// Video models that support first/last frame references (image-to-video)
const VIDEO_MODELS = [
  { id: 'fal-ai/kling-video/v2.1/master/image-to-video', name: 'Kling 2.1 Master', desc: 'Premium motion fluidity' },
  { id: 'fal-ai/kling-video/v2.6/pro/image-to-video', name: 'Kling 2.6 Pro', desc: 'Latest Kling with pro features' },
  { id: 'fal-ai/wan/v2.6/image-to-video', name: 'Wan 2.6 I2V', desc: 'Alibaba latest, great motion' },
  { id: 'fal-ai/wan-pro/image-to-video', name: 'Wan Pro I2V', desc: 'Professional quality' },
  { id: 'fal-ai/luma-dream-machine/ray-2/image-to-video', name: 'Luma Ray 2', desc: 'Cinematic quality' },
  { id: 'fal-ai/minimax-video/image-to-video', name: 'MiniMax Hailuo', desc: 'High quality, fast' },
  { id: 'fal-ai/vidu/image-to-video', name: 'Vidu I2V', desc: 'Up to 7 reference images' },
  { id: 'fal-ai/ltx-video/image-to-video', name: 'LTX Video', desc: 'Fast conversion' },
  { id: 'fal-ai/hunyuan-video-image-to-video', name: 'Hunyuan I2V', desc: 'Open-source, diverse motion' },
  { id: 'fal-ai/pixverse/v4.5/image-to-video', name: 'Pixverse V4.5', desc: 'High quality motion' },
];

export interface ShotData {
  id: string;
  orderIndex: number;
  prompt: string;
  duration: number;
  firstFrameUrl?: string | null;
  lastFrameUrl?: string | null;
  firstFramePrompt?: string | null;
  lastFramePrompt?: string | null;
  outputUrl?: string | null;
  status: 'pending' | 'generating' | 'complete' | 'failed';
  failureReason?: string | null;
  imageModel?: string | null; // Model to use for frame generation
  imageResolution?: string | null; // Image output resolution (720p, 1080p, 4k)
  videoModel?: string | null; // Model to use for video generation (I2V)
  videoResolution?: string | null; // Video output resolution (480p, 720p, 1080p)
  // Iteration tracking for cost calculation
  firstFrameIterations?: number; // Number of times first frame was generated
  lastFrameIterations?: number;  // Number of times last frame was generated
  videoIterations?: number;      // Number of times video was generated
}

interface StoryboardShotProps {
  shot: ShotData;
  sceneTitle?: string;
  sceneDescription?: string;
  elements?: ElementData[];  // For @reference autocomplete
  projectId?: string;        // For filtering elements
  onUpdate: (id: string, updates: Partial<ShotData>) => void;
  onDelete: (id: string) => void;
  onGenerate: (id: string) => void;
  onUploadFrame: (id: string, frameType: 'first' | 'last', file: File) => void;
  onGenerateFrame?: (id: string, frameType: 'first' | 'last') => void;
  onEnhancePrompt?: (id: string) => void;
  onEnhanceFramePrompt?: (id: string, frameType: 'first' | 'last') => void;
  onEnhanceVideoPrompt?: (id: string) => void; // Smart Prompt Builder for video prompt (uses video model)
  isGenerating?: boolean;
  isGeneratingFirstFrame?: boolean;
  isGeneratingLastFrame?: boolean;
  dragHandleProps?: any;
}

export default function StoryboardShot({
  shot,
  sceneTitle,
  sceneDescription,
  elements = [],
  projectId,
  onUpdate,
  onDelete,
  onGenerate,
  onUploadFrame,
  onGenerateFrame,
  onEnhancePrompt,
  onEnhanceFramePrompt,
  onEnhanceVideoPrompt,
  isGenerating = false,
  isGeneratingFirstFrame = false,
  isGeneratingLastFrame = false,
  dragHandleProps,
}: StoryboardShotProps) {
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state for expanded viewing
  const [lightboxOpen, setLightboxOpen] = useState<'first' | 'last' | 'video' | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  // Expanded prompt state - tracks which prompt is expanded inline
  const [expandedPrompt, setExpandedPrompt] = useState<'first' | 'last' | 'shot' | null>(null);
  const shotTriggerRef = useRef<HTMLDivElement>(null);
  const [shotPopoutPosition, setShotPopoutPosition] = useState<{ top: number; left: number } | null>(null);

  // Local editing state - buffers changes to prevent parent re-renders while typing
  const [editingFirstPrompt, setEditingFirstPrompt] = useState('');
  const [editingLastPrompt, setEditingLastPrompt] = useState('');
  const [editingShotPrompt, setEditingShotPrompt] = useState('');

  // Prompt weighting hooks for Ctrl/Cmd + Arrow Up/Down keyboard shortcuts
  const firstPromptWeighting = usePromptWeighting({
    value: editingFirstPrompt,
    onChange: setEditingFirstPrompt,
  });
  const lastPromptWeighting = usePromptWeighting({
    value: editingLastPrompt,
    onChange: setEditingLastPrompt,
  });
  const shotPromptWeighting = usePromptWeighting({
    value: editingShotPrompt,
    onChange: setEditingShotPrompt,
  });

  // Autocomplete hooks for @reference, #prop, $variable
  const firstAutocomplete = usePromptAutocomplete({
    value: editingFirstPrompt,
    onChange: setEditingFirstPrompt,
    elements,
    projectId,
  });
  const lastAutocomplete = usePromptAutocomplete({
    value: editingLastPrompt,
    onChange: setEditingLastPrompt,
    elements,
    projectId,
  });
  const shotAutocomplete = usePromptAutocomplete({
    value: editingShotPrompt,
    onChange: setEditingShotPrompt,
    elements,
    projectId,
  });

  // Initialize local state when opening a prompt
  useEffect(() => {
    if (expandedPrompt === 'first') {
      setEditingFirstPrompt(shot.firstFramePrompt || '');
    } else if (expandedPrompt === 'last') {
      setEditingLastPrompt(shot.lastFramePrompt || '');
    } else if (expandedPrompt === 'shot') {
      setEditingShotPrompt(shot.prompt || '');
    }
  }, [expandedPrompt, shot.firstFramePrompt, shot.lastFramePrompt, shot.prompt]);

  // Handle blur to collapse and save
  const handlePromptBlur = (type: 'first' | 'last' | 'shot') => {
    // Save the edited value to parent
    if (type === 'first') {
      onUpdate(shot.id, { firstFramePrompt: editingFirstPrompt });
    } else if (type === 'last') {
      onUpdate(shot.id, { lastFramePrompt: editingLastPrompt });
    } else if (type === 'shot') {
      onUpdate(shot.id, { prompt: editingShotPrompt });
    }

    // Small delay to allow clicking other elements
    setTimeout(() => {
      if (expandedPrompt === type) {
        setExpandedPrompt(null);
        if (type === 'shot') {
          setShotPopoutPosition(null);
        }
      }
    }, 200);
  };

  // Open shot prompt with portal positioning
  const handleOpenShotPrompt = () => {
    if (shot.status === 'generating') return;
    if (shotTriggerRef.current) {
      const rect = shotTriggerRef.current.getBoundingClientRect();
      setShotPopoutPosition({ top: rect.top, left: rect.left });
    }
    setExpandedPrompt('shot');
  };

  const handleFrameUpload =
    (frameType: 'first' | 'last') => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUploadFrame(shot.id, frameType, file);
      }
    };

  return (
    <TooltipProvider>
    <div className="flex gap-4">
      {/* Left Panel - Scene Info */}
      <div className="flex w-[420px] flex-shrink-0 flex-col rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
        {/* Scene Title & Description */}
        <div className="mb-6 flex items-start gap-2">
          <div
            {...dragHandleProps}
            className="mt-1 cursor-grab text-gray-500 hover:text-white active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">
              {sceneTitle || `Shot ${shot.orderIndex + 1}`}
            </h3>
            {sceneDescription && (
              <p className="mt-2 text-xs leading-relaxed text-gray-400">{sceneDescription}</p>
            )}
          </div>
          <Tooltip content="Delete shot" side="top">
            <button
              onClick={() => onDelete(shot.id)}
              className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

        {/* First Frame Prompt */}
        <div className="relative mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-green-400">
              First Frame Prompt
            </span>
            {onEnhanceFramePrompt && shot.firstFramePrompt && (
              <Tooltip content="Enhance with Smart Prompt Builder" side="top">
                <button
                  onClick={() => onEnhanceFramePrompt(shot.id, 'first')}
                  className="rounded p-1 text-purple-400 transition-colors hover:bg-purple-500/10"
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
          </div>
          {/* Collapsed display */}
          <div
            onClick={() => setExpandedPrompt('first')}
            className="min-h-[60px] w-full cursor-pointer rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white transition-colors hover:border-green-500/30"
          >
            {shot.firstFramePrompt ? (
              <span className="line-clamp-3">{shot.firstFramePrompt}</span>
            ) : (
              <span className="text-gray-600">Click to edit...</span>
            )}
          </div>
          {/* Pop-out bubble */}
          {expandedPrompt === 'first' && (
            <div className="absolute top-0 left-0 z-50 w-[600px] animate-in fade-in zoom-in-95 duration-150">
              <div className="relative rounded-xl border border-green-500/50 bg-[#1a1a1a] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-green-400">
                    First Frame Prompt
                  </span>
                </div>
                {/* Autocomplete popup above textarea */}
                <AutocompletePopup
                  isOpen={firstAutocomplete.autocomplete.isOpen}
                  items={firstAutocomplete.filteredItems}
                  query={firstAutocomplete.autocomplete.query}
                  triggerType={firstAutocomplete.autocomplete.triggerType}
                  onSelect={firstAutocomplete.selectItem}
                  onClose={firstAutocomplete.close}
                  className="bottom-full left-0 right-0 mb-2"
                />
                <textarea
                  autoFocus
                  value={editingFirstPrompt}
                  onChange={firstAutocomplete.handleChange}
                  onKeyDown={(e) => {
                    // Autocomplete gets priority when open
                    if (firstAutocomplete.autocomplete.isOpen) {
                      firstAutocomplete.handleKeyDown(e);
                      if (e.defaultPrevented) return;
                    }
                    // Then prompt weighting
                    firstPromptWeighting.handleKeyDown(e);
                  }}
                  onBlur={() => handlePromptBlur('first')}
                  placeholder="Describe the first frame... (use @element #prop $variable)"
                  rows={Math.max(5, editingFirstPrompt.split('\n').length + Math.ceil(editingFirstPrompt.length / 80))}
                  className="w-full resize-none rounded-lg border border-green-500/30 bg-black/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-green-500/50 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Last Frame Prompt */}
        <div className="relative mb-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-purple-400">
              Last Frame Prompt
            </span>
            {onEnhanceFramePrompt && shot.lastFramePrompt && (
              <Tooltip content="Enhance with Smart Prompt Builder" side="top">
                <button
                  onClick={() => onEnhanceFramePrompt(shot.id, 'last')}
                  className="rounded p-1 text-purple-400 transition-colors hover:bg-purple-500/10"
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
          </div>
          {/* Collapsed display */}
          <div
            onClick={() => setExpandedPrompt('last')}
            className="min-h-[60px] w-full cursor-pointer rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white transition-colors hover:border-purple-500/30"
          >
            {shot.lastFramePrompt ? (
              <span className="line-clamp-3">{shot.lastFramePrompt}</span>
            ) : (
              <span className="text-gray-600">Click to edit...</span>
            )}
          </div>
          {/* Pop-out bubble */}
          {expandedPrompt === 'last' && (
            <div className="absolute top-0 left-0 z-50 w-[600px] animate-in fade-in zoom-in-95 duration-150">
              <div className="relative rounded-xl border border-purple-500/50 bg-[#1a1a1a] p-3 shadow-2xl shadow-black/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-purple-400">
                    Last Frame Prompt
                  </span>
                </div>
                {/* Autocomplete popup above textarea */}
                <AutocompletePopup
                  isOpen={lastAutocomplete.autocomplete.isOpen}
                  items={lastAutocomplete.filteredItems}
                  query={lastAutocomplete.autocomplete.query}
                  triggerType={lastAutocomplete.autocomplete.triggerType}
                  onSelect={lastAutocomplete.selectItem}
                  onClose={lastAutocomplete.close}
                  className="bottom-full left-0 right-0 mb-2"
                />
                <textarea
                  autoFocus
                  value={editingLastPrompt}
                  onChange={lastAutocomplete.handleChange}
                  onKeyDown={(e) => {
                    // Autocomplete gets priority when open
                    if (lastAutocomplete.autocomplete.isOpen) {
                      lastAutocomplete.handleKeyDown(e);
                      if (e.defaultPrevented) return;
                    }
                    // Then prompt weighting
                    lastPromptWeighting.handleKeyDown(e);
                  }}
                  onBlur={() => handlePromptBlur('last')}
                  placeholder="Describe the last frame... (use @element #prop $variable)"
                  rows={Math.max(5, editingLastPrompt.split('\n').length + Math.ceil(editingLastPrompt.length / 80))}
                  className="w-full resize-none rounded-lg border border-purple-500/30 bg-black/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Image Model Selector - for frame generation */}
        <div className="mb-3">
          <div className="mb-1 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400">
              Frame Model
            </span>
          </div>
          <div className="relative">
            <select
              value={shot.imageModel || 'fal-ai/flux/dev'}
              onChange={e => onUpdate(shot.id, { imageModel: e.target.value })}
              className="w-full appearance-none rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 pr-8 text-xs text-white transition-colors hover:border-amber-500/30 focus:border-amber-500/50 focus:outline-none"
            >
              {IMAGE_MODELS.map(model => (
                <option key={model.id} value={model.id} className="bg-[#1a1a1a]">
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          {/* Description with Image Resolution and pricing */}
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-[10px] text-gray-500">
              {IMAGE_MODELS.find(m => m.id === (shot.imageModel || 'fal-ai/flux/dev'))?.desc || ''}
            </p>
            {/* Image Resolution dropdown with pricing */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Per-image cost (amber) */}
              <span className="text-[10px] text-amber-400/70">
                {estimateImageCost(shot.imageModel, shot.imageResolution)}
              </span>
              {/* Total spent (cyan) - only shows when iterations exist */}
              {((shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)) > 0 && (
                <span className="text-[10px] text-cyan-400">
                  → {formatCost(
                    ((shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)) *
                    calculateImageCost(shot.imageModel, shot.imageResolution)
                  )}
                  <span className="ml-0.5 text-gray-500">
                    ({(shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)}×)
                  </span>
                </span>
              )}
              <div className="relative">
                <select
                  value={shot.imageResolution || '1080p'}
                  onChange={e => onUpdate(shot.id, { imageResolution: e.target.value })}
                  className="appearance-none rounded border border-white/10 bg-black/40 px-2 py-0.5 pr-6 text-[10px] text-white transition-colors hover:border-amber-500/30 focus:border-amber-500/50 focus:outline-none"
                >
                  {IMAGE_RESOLUTIONS.map(res => (
                    <option key={res.id} value={res.id} className="bg-[#1a1a1a]">
                      {res.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Beginning & Ending Frame Uploads */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Beginning Image */}
          <div className="relative">
            {/* Label with iteration count and Regen icon */}
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-green-400">
                  First Frame
                </span>
                {(shot.firstFrameIterations || 0) > 0 && (
                  <span className="rounded bg-green-500/20 px-1 py-0.5 text-[9px] font-medium text-green-400">
                    ×{shot.firstFrameIterations}
                  </span>
                )}
              </div>
              {shot.firstFrameUrl && onGenerateFrame && shot.firstFramePrompt && (
                <Tooltip content="Iterate from prompt" side="top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateFrame(shot.id, 'first');
                    }}
                    className="rounded p-0.5 text-green-400 transition-colors hover:bg-green-500/20"
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </button>
                </Tooltip>
              )}
            </div>
            <input
              ref={firstFrameInputRef}
              type="file"
              accept="image/*"
              onChange={handleFrameUpload('first')}
              className="hidden"
            />
            <div
              onClick={() => {
                if (isGeneratingFirstFrame) return;
                if (shot.firstFrameUrl) {
                  setLightboxOpen('first');
                  setLightboxZoom(1);
                } else {
                  firstFrameInputRef.current?.click();
                }
              }}
              className={clsx(
                'aspect-video overflow-hidden rounded-lg border-2 border-dashed transition-all',
                isGeneratingFirstFrame
                  ? 'cursor-wait border-green-500/50 bg-green-500/10'
                  : shot.firstFrameUrl
                    ? 'cursor-zoom-in border-green-500/50 bg-black/30'
                    : 'cursor-pointer border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30'
              )}
            >
              {isGeneratingFirstFrame ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                  <span className="text-[10px] text-green-400">Generating...</span>
                </div>
              ) : shot.firstFrameUrl ? (
                <img
                  src={resolveUrl(shot.firstFrameUrl)}
                  alt="Beginning frame"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            {/* Full-width Generate button */}
            {onGenerateFrame && shot.firstFramePrompt && !shot.firstFrameUrl && (
              <Tooltip content="Generate first frame from prompt" side="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateFrame(shot.id, 'first');
                  }}
                  disabled={isGeneratingFirstFrame}
                  className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-green-500/20 py-1 text-[10px] font-medium text-green-400 transition-colors hover:bg-green-500/30"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate
                </button>
              </Tooltip>
            )}
          </div>

          {/* Ending Image */}
          <div className="relative">
            {/* Label with iteration count and Regen icon */}
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-purple-400">
                  Last Frame
                </span>
                {(shot.lastFrameIterations || 0) > 0 && (
                  <span className="rounded bg-purple-500/20 px-1 py-0.5 text-[9px] font-medium text-purple-400">
                    ×{shot.lastFrameIterations}
                  </span>
                )}
              </div>
              {shot.lastFrameUrl && onGenerateFrame && shot.lastFramePrompt && (
                <Tooltip content="Iterate from prompt" side="top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateFrame(shot.id, 'last');
                    }}
                    className="rounded p-0.5 text-purple-400 transition-colors hover:bg-purple-500/20"
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </button>
                </Tooltip>
              )}
            </div>
            <input
              ref={lastFrameInputRef}
              type="file"
              accept="image/*"
              onChange={handleFrameUpload('last')}
              className="hidden"
            />
            <div
              onClick={() => {
                if (isGeneratingLastFrame) return;
                if (shot.lastFrameUrl) {
                  setLightboxOpen('last');
                  setLightboxZoom(1);
                } else {
                  lastFrameInputRef.current?.click();
                }
              }}
              className={clsx(
                'aspect-video overflow-hidden rounded-lg border-2 border-dashed transition-all',
                isGeneratingLastFrame
                  ? 'cursor-wait border-purple-500/50 bg-purple-500/10'
                  : shot.lastFrameUrl
                    ? 'cursor-zoom-in border-purple-500/50 bg-black/30'
                    : 'cursor-pointer border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/30'
              )}
            >
              {isGeneratingLastFrame ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <span className="text-[10px] text-purple-400">Generating...</span>
                </div>
              ) : shot.lastFrameUrl ? (
                <img
                  src={resolveUrl(shot.lastFrameUrl)}
                  alt="Ending frame"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            {/* Full-width Generate button */}
            {onGenerateFrame && shot.lastFramePrompt && !shot.lastFrameUrl && (
              <Tooltip content="Generate last frame from prompt" side="bottom">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateFrame(shot.id, 'last');
                  }}
                  disabled={isGeneratingLastFrame}
                  className="mt-1.5 flex w-full items-center justify-center gap-1 rounded bg-purple-500/20 py-1 text-[10px] font-medium text-purple-400 transition-colors hover:bg-purple-500/30"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate
                </button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Shot Card */}
      <div className="min-w-[700px] flex-1 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
        {/* Video Preview Area */}
        <div
          className="relative bg-gradient-to-br from-gray-800/50 to-black/50"
          onMouseEnter={() => setIsHoveringPreview(true)}
          onMouseLeave={() => setIsHoveringPreview(false)}
        >
          {/* Shot Number Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded bg-black/60 px-2 py-1 backdrop-blur-sm">
            <GripVertical className="h-3 w-3 text-gray-400" />
            <span className="text-sm font-medium text-white">{shot.orderIndex + 1}</span>
          </div>

          {/* Status Badge with Regen icon */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {/* Iterate icon - only shows when complete */}
            {shot.status === 'complete' && shot.outputUrl && (
              <Tooltip content="Iterate video" side="top">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerate(shot.id);
                  }}
                  className="flex items-center justify-center rounded-full bg-black/60 p-1.5 text-cyan-400 backdrop-blur-sm transition-colors hover:bg-cyan-500/20"
                >
                  <RefreshCcw className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
            {shot.status === 'generating' && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-400 backdrop-blur-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                Generating
              </div>
            )}
            {shot.status === 'complete' && (
              <div className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400 backdrop-blur-sm">
                <Check className="h-3 w-3" />
                Complete
                {(shot.videoIterations || 0) > 0 && (
                  <span className="ml-1 rounded bg-green-500/30 px-1 text-[9px]">
                    ×{shot.videoIterations}
                  </span>
                )}
              </div>
            )}
            {shot.status === 'failed' && (
              <div
                className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400 backdrop-blur-sm"
                title={shot.failureReason || ''}
              >
                <AlertCircle className="h-3 w-3" />
                Failed
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div
            className={clsx(
              'aspect-video',
              shot.outputUrl && 'cursor-zoom-in'
            )}
            onClick={() => {
              if (shot.outputUrl) {
                setLightboxOpen('video');
                setLightboxZoom(1);
              }
            }}
          >
            {shot.outputUrl ? (
              <video
                src={resolveUrl(shot.outputUrl)}
                className="h-full w-full object-cover"
                controls={isHoveringPreview}
                muted
                loop
                playsInline
                onClick={(e) => e.stopPropagation()} // Allow video controls without triggering lightbox
                onMouseEnter={e => (e.target as HTMLVideoElement).play()}
                onMouseLeave={e => {
                  (e.target as HTMLVideoElement).pause();
                  (e.target as HTMLVideoElement).currentTime = 0;
                }}
              />
            ) : shot.firstFrameUrl ? (
              <img
                src={resolveUrl(shot.firstFrameUrl)}
                alt="Preview"
                className="h-full w-full object-cover opacity-60"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="h-16 w-16 text-gray-700" />
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex items-end gap-3 border-t border-white/5 bg-black/40 px-4 py-3">
          {/* Duration */}
          <div>
            <div className="mb-1 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-blue-400">
                Duration
              </span>
            </div>
            <select
              value={shot.duration}
              onChange={e => onUpdate(shot.id, { duration: parseInt(e.target.value) || 5 })}
              className="w-[72px] appearance-none rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white transition-colors hover:border-blue-500/30 focus:border-blue-500/50 focus:outline-none"
            >
              {[3, 5, 7, 10, 15, 20, 30].map(d => (
                <option key={d} value={d} className="bg-[#1a1a1a]">
                  {d}s
                </option>
              ))}
            </select>
          </div>

          {/* Video Model + Resolution */}
          <div>
            {/* Header with label */}
            <div className="mb-1 flex items-center gap-1.5">
              <Video className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-cyan-400">
                Video Model
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip
                content={VIDEO_MODELS.find(m => m.id === (shot.videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video'))?.desc || ''}
                side="top"
              >
                <div className="relative">
                  <select
                    value={shot.videoModel || 'fal-ai/kling-video/v2.1/master/image-to-video'}
                    onChange={e => onUpdate(shot.id, { videoModel: e.target.value })}
                    className="w-[160px] appearance-none rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 pr-8 text-xs text-white transition-colors hover:border-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                  >
                    {VIDEO_MODELS.map(model => (
                      <option key={model.id} value={model.id} className="bg-[#1a1a1a]">
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                </div>
              </Tooltip>
              <div className="relative">
                <select
                  value={shot.videoResolution || '720p'}
                  onChange={e => onUpdate(shot.id, { videoResolution: e.target.value })}
                  className="appearance-none rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 pr-7 text-xs text-white transition-colors hover:border-cyan-500/30 focus:border-cyan-500/50 focus:outline-none"
                >
                  {getVideoResolutions(shot.videoModel).map(res => (
                    <option key={res.id} value={res.id} className="bg-[#1a1a1a]">
                      {res.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Spacer to push pricing + Generate button to right */}
          <div className="flex-1" />

          {/* Pricing */}
          <div className="flex items-end gap-1.5">
            {/* Per-video cost (emerald) */}
            <span className="pb-1.5 text-[10px] text-emerald-400/70">
              {estimateVideoCost(shot.videoModel, shot.videoResolution, shot.duration || 5)}
            </span>
            {/* Total spent (cyan) - only shows when iterations exist */}
            {(shot.videoIterations || 0) > 0 && (
              <span className="pb-1.5 text-[10px] text-cyan-400">
                → {formatCost(
                  (shot.videoIterations || 0) *
                  calculateVideoCost(shot.videoModel, shot.videoResolution, shot.duration || 5)
                )}
                <span className="ml-0.5 text-gray-500">
                  ({shot.videoIterations}×)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Per-Shot Cost Summary (only shows if iterations exist) */}
        {((shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0) + (shot.videoIterations || 0)) > 0 && (
          <div className="border-t border-white/5 bg-black/20 px-4 py-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500 uppercase">Shot Spend</span>
              <div className="flex items-center gap-3">
                {((shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)) > 0 && (
                  <span className="text-amber-400/80">
                    {(shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)} frames: {formatCost(
                      ((shot.firstFrameIterations || 0) + (shot.lastFrameIterations || 0)) *
                      calculateImageCost(shot.imageModel, shot.imageResolution)
                    )}
                  </span>
                )}
                {(shot.videoIterations || 0) > 0 && (
                  <span className="text-emerald-400/80">
                    {shot.videoIterations} video{(shot.videoIterations || 0) > 1 ? 's' : ''}: {formatCost(
                      (shot.videoIterations || 0) *
                      calculateVideoCost(shot.videoModel, shot.videoResolution, shot.duration || 5)
                    )}
                  </span>
                )}
                <span className="font-medium text-white">
                  = {formatCost(calculateTotalShotCost(shot).total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Area */}
        <div className="relative border-t border-white/5 px-4 py-3">
          {/* Header with label and Smart Prompt Builder button */}
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-cyan-400">
              Video Prompt
            </span>
            {onEnhanceVideoPrompt && shot.prompt && (
              <Tooltip content="Enhance with Smart Prompt Builder" side="top">
                <button
                  onClick={() => onEnhanceVideoPrompt(shot.id)}
                  className="rounded p-1 text-purple-400 transition-colors hover:bg-purple-500/10"
                >
                  <Sparkles className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
          </div>
          {/* Collapsed display */}
          <div
            ref={shotTriggerRef}
            onClick={handleOpenShotPrompt}
            className={clsx(
              'min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm transition-colors',
              shot.status === 'generating'
                ? 'cursor-not-allowed border-white/5 bg-black/10 text-gray-500'
                : 'cursor-pointer border-white/10 bg-black/20 text-white hover:border-cyan-500/30'
            )}
          >
            {shot.prompt ? (
              <span className="line-clamp-4">{shot.prompt}</span>
            ) : (
              <span className="text-gray-600">Click to describe the action in this shot...</span>
            )}
          </div>

          {/* Full-width Generate Video button */}
          {shot.prompt && shot.firstFrameUrl && !shot.outputUrl && !isGenerating && (
            <Tooltip content="Generate video from first frame and prompt" side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerate(shot.id);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-cyan-500/20 py-2 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Video
              </button>
            </Tooltip>
          )}
        </div>

        {/* Pop-out bubble via Portal - escapes overflow constraints */}
        {expandedPrompt === 'shot' && shotPopoutPosition && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed z-[9999] w-[700px] animate-in fade-in zoom-in-95 duration-150"
            style={{ top: shotPopoutPosition.top, left: shotPopoutPosition.left }}
          >
            <div className="relative rounded-xl border border-cyan-500/50 bg-[#1a1a1a] p-3 shadow-2xl shadow-black/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                  Shot Prompt
                </span>
                {/* Duration Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                    Duration
                  </label>
                  <select
                    value={shot.duration}
                    onChange={e => onUpdate(shot.id, { duration: parseInt(e.target.value) || 5 })}
                    onMouseDown={e => e.stopPropagation()}
                    className="appearance-none rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
                  >
                    {[3, 5, 7, 10, 15, 20, 30].map(d => (
                      <option key={d} value={d} className="bg-[#1a1a1a]">
                        {d}s
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Autocomplete popup above textarea */}
              <AutocompletePopup
                isOpen={shotAutocomplete.autocomplete.isOpen}
                items={shotAutocomplete.filteredItems}
                query={shotAutocomplete.autocomplete.query}
                triggerType={shotAutocomplete.autocomplete.triggerType}
                onSelect={shotAutocomplete.selectItem}
                onClose={shotAutocomplete.close}
                className="bottom-full left-0 right-0 mb-2"
              />
              <textarea
                autoFocus
                value={editingShotPrompt}
                onChange={shotAutocomplete.handleChange}
                onKeyDown={(e) => {
                  // Autocomplete gets priority when open
                  if (shotAutocomplete.autocomplete.isOpen) {
                    shotAutocomplete.handleKeyDown(e);
                    if (e.defaultPrevented) return;
                  }
                  // Then prompt weighting
                  shotPromptWeighting.handleKeyDown(e);
                }}
                onBlur={() => handlePromptBlur('shot')}
                placeholder="Describe the action in this shot... (use @element #prop $variable)"
                rows={Math.max(6, editingShotPrompt.split('\n').length + Math.ceil(editingShotPrompt.length / 90))}
                className="w-full resize-none rounded-lg border border-cyan-500/30 bg-black/60 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          </div>,
          document.body
        )}

        {/* Error Message */}
        {shot.failureReason && (
          <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2">
            <p className="text-xs text-red-400">{shot.failureReason}</p>
          </div>
        )}
      </div>
    </div>

    {/* Lightbox Modal */}
    {lightboxOpen && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={() => setLightboxOpen(null)}
      >
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className={clsx(
              'rounded-full px-3 py-1 text-sm font-medium',
              lightboxOpen === 'first' && 'bg-green-500/20 text-green-400',
              lightboxOpen === 'last' && 'bg-purple-500/20 text-purple-400',
              lightboxOpen === 'video' && 'bg-cyan-500/20 text-cyan-400'
            )}>
              {lightboxOpen === 'first' && 'First Frame'}
              {lightboxOpen === 'last' && 'Last Frame'}
              {lightboxOpen === 'video' && 'Video'}
            </span>
            <span className="text-sm text-gray-400">Shot {shot.orderIndex + 1}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom controls (images only) */}
            {lightboxOpen !== 'video' && (
              <>
                <Tooltip content="Zoom out" side="bottom">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxZoom(z => Math.max(0.5, z - 0.25));
                    }}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                </Tooltip>
                <span className="min-w-[3rem] text-center text-sm text-white">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <Tooltip content="Zoom in" side="bottom">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxZoom(z => Math.min(3, z + 0.25));
                    }}
                    className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </Tooltip>
              </>
            )}

            {/* Download */}
            <Tooltip content="Download" side="bottom">
              <a
                href={resolveUrl(
                  lightboxOpen === 'first' ? shot.firstFrameUrl :
                  lightboxOpen === 'last' ? shot.lastFrameUrl :
                  shot.outputUrl
                )}
                download
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </a>
            </Tooltip>

            {/* Replace/Upload */}
            <Tooltip content="Replace" side="bottom">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (lightboxOpen === 'first') {
                    firstFrameInputRef.current?.click();
                  } else if (lightboxOpen === 'last') {
                    lastFrameInputRef.current?.click();
                  }
                  setLightboxOpen(null);
                }}
                className={clsx(
                  'rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20',
                  lightboxOpen === 'video' && 'hidden'
                )}
              >
                <Upload className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Close */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(null);
              }}
              className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex max-h-[85vh] max-w-[90vw] items-center justify-center overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {lightboxOpen === 'video' ? (
            <video
              src={resolveUrl(shot.outputUrl)}
              className="max-h-[85vh] max-w-[90vw] rounded-lg"
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              src={resolveUrl(lightboxOpen === 'first' ? shot.firstFrameUrl : shot.lastFrameUrl)}
              alt={lightboxOpen === 'first' ? 'First frame' : 'Last frame'}
              className="rounded-lg transition-transform duration-200"
              style={{ transform: `scale(${lightboxZoom})` }}
            />
          )}
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          Press <kbd className="rounded border border-gray-600 px-1.5 py-0.5">Esc</kbd> or click outside to close
        </div>
      </div>,
      document.body
    )}
    </TooltipProvider>
  );
}

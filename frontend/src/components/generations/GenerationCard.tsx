'use client';

import { useState, useRef, useEffect } from 'react';
import { Generation, Element } from '@/lib/store';
import { analyzeGeneration, refineGeneration } from '@/lib/api';
import {
  Heart,
  Download,
  Trash2,
  X,
  Play,
  Loader2,
  Sparkles,
  Check,
  Maximize2,
  ZoomIn,
  FilePlus,
  Wand2,
  AlertTriangle,
  Lightbulb,
  Paintbrush,
  Film,
  ThumbsUp,
  ThumbsDown,
  Copy,
  GitFork,
  Clock,
  Zap,
  Expand,
  Layers,
  Sun,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useDraggable } from '@dnd-kit/core';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { CSS } from '@dnd-kit/utilities';
import {
  getModelConstraints,
  getConstraintViolations,
  getModelTips,
  ModelConstraints,
} from '@/lib/ModelConstraints';

interface GenerationCardProps {
  generation: Generation;
  elements?: Element[]; // Pass elements for lookup
  onUpdate: (id: string, updates: Partial<Generation>) => void;
  onDelete: (id: string) => void;
  onIterate: (prompt: string) => void;
  onUseSettings?: (generation: Generation) => void;
  onEdit?: () => void;
  onAnimate?: (imageUrl: string) => void;
  onRetake?: (videoUrl: string) => void;
  onInpaint?: (imageUrl: string, aspectRatio?: string) => void;
  onUpscale?: (imageUrl: string, model: string) => void;
  onSaveAsElement?: (url: string, type: 'image' | 'video') => void;
  onEnhanceVideo?: (generationId: string, mode: 'full' | 'audio-only' | 'smooth-only') => void;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
  onFindSimilarComposition?: (generationId: string) => void;
  onFindSimilarLighting?: (generationId: string) => void;
  onFindSimilarVisual?: (generationId: string) => void;  // CLIP vector-based visual similarity
}

// Upscale options
const UPSCALE_OPTIONS: Array<{ id: string; name: string; description: string }> = [
  { id: 'fal-ai/clarity-upscaler', name: 'Clarity 2x', description: 'Sharp, detailed upscale' },
  { id: 'fal-ai/creative-upscaler', name: 'Clarity 4x', description: 'Maximum quality upscale' },
  { id: 'fal-ai/aura-sr', name: 'Aura SR', description: 'Fast AI upscaling' },
];

// Enhance video options
const ENHANCE_ITEMS: Array<{
  mode: 'full' | 'audio-only' | 'smooth-only';
  emoji: string;
  title: string;
  description: string;
}> = [
  {
    mode: 'audio-only',
    emoji: '🔊',
    title: 'Add Audio Only',
    description: 'MMAudio (no speed change)',
  },
  {
    mode: 'smooth-only',
    emoji: '🎬',
    title: 'Smooth Only',
    description: 'RIFE interpolation (24fps)',
  },
  { mode: 'full', emoji: '✨', title: 'Full Enhancement', description: 'Smooth + Audio' },
];

export function GenerationCard({
  generation,
  elements,
  onUpdate,
  onDelete,
  onIterate,
  onUseSettings,
  onEdit,
  onAnimate,
  onRetake,
  onInpaint,
  onUpscale,
  onSaveAsElement,
  onEnhanceVideo,
  isSelected,
  onToggleSelection,
  onFindSimilarComposition,
  onFindSimilarLighting,
  onFindSimilarVisual,
}: GenerationCardProps) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: generation.id,
    data: {
      type: 'generation',
      generation,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0 : 1, // Hide original card while dragging
        zIndex: isDragging ? 100 : undefined,
      }
    : undefined;

  const [isHovered, setIsHovered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0); // 0-1 position for scrub indicator
  const [editedPrompt, setEditedPrompt] = useState(generation.inputPrompt);
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUpscaleMenu, setShowUpscaleMenu] = useState(false);
  const [showEnhanceMenu, setShowEnhanceMenu] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestoreSettings = async () => {
    if (!onUseSettings) return;
    setIsRestoring(true);
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    onUseSettings(generation);
    setIsRestoring(false);
    setShowPopup(false);
  };

  // Copy Recipe: Format all generation settings as shareable JSON
  const handleCopyRecipe = async () => {
    const recipe = {
      // Core prompt
      prompt: generation.inputPrompt,
      negativePrompt: generation.usedLoras?.negativePrompt || null,

      // Model settings
      model: generation.usedLoras?.model || 'unknown',
      provider: generation.usedLoras?.provider || 'unknown',

      // Generation parameters
      aspectRatio: generation.aspectRatio,
      seed: generation.usedLoras?.seed || 'random',
      steps: generation.usedLoras?.steps || null,
      guidanceScale: generation.usedLoras?.guidanceScale || null,
      strength: generation.usedLoras?.strength || null,

      // Sampler/Scheduler
      sampler:
        typeof generation.usedLoras?.sampler === 'object'
          ? (generation.usedLoras.sampler as any).value ||
            (generation.usedLoras.sampler as any).name
          : generation.usedLoras?.sampler || null,
      scheduler:
        typeof generation.usedLoras?.scheduler === 'object'
          ? (generation.usedLoras.scheduler as any).value ||
            (generation.usedLoras.scheduler as any).name
          : generation.usedLoras?.scheduler || null,

      // LoRAs
      loras:
        generation.usedLoras?.loras?.map((lora: any) => ({
          id: lora.id,
          name: lora.name,
          path: lora.path,
          strength: lora.strength,
          triggerWord: lora.triggerWord,
        })) || [],

      // Reference images (IDs only for privacy)
      referenceStrengths: generation.usedLoras?.referenceStrengths || {},

      // Metadata
      _vibeboardRecipe: true,
      _version: '1.0',
      _createdAt: generation.createdAt,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
      toast.success('Recipe copied to clipboard!', {
        description: 'Paste into any text editor or share with others',
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to copy recipe:', err);
      toast.error('Failed to copy recipe');
    }
  };

  // Feedback State for Analysis
  const [showAnalysisInput, setShowAnalysisInput] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState('');

  // AI Critique Feedback State
  const [critiqueFeedbackGiven, setCritiqueFeedbackGiven] = useState<
    'positive' | 'negative' | null
  >(null);
  const [showCritiqueCorrection, setShowCritiqueCorrection] = useState(false);
  const [critiqueCorrection, setCritiqueCorrection] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const handleSmartRefine = async () => {
    setIsRefining(true);
    try {
      console.log('Triggering Smart Refine for', generation.id);
      const result = await refineGeneration(generation.projectId, generation.id, '');
      if (result.success && result.refinedPrompt) {
        setEditedPrompt(result.refinedPrompt);
        console.log('Smart Refine success:', result);
      }
      setIsEditing(true); // Open edit mode with refined prompt (or old one if moved too fast)
    } catch (error) {
      console.error('Smart Refine failed', error);
      setIsEditing(true);
    } finally {
      setIsRefining(false);
    }
  };

  const confirmAnalyze = async () => {
    setIsAnalyzing(true);
    setShowAnalysisInput(false);
    // Reset feedback state for new analysis
    setCritiqueFeedbackGiven(null);
    setShowCritiqueCorrection(false);
    setCritiqueCorrection('');
    try {
      const analysis = await analyzeGeneration(
        generation.projectId,
        generation.id,
        analysisFeedback
      );
      // Update local state via onUpdate to show the new analysis immediately
      onUpdate(generation.id, {
        aiAnalysis: JSON.stringify(analysis),
        rating: analysis.rating,
      });
      toast.success(`Analysis complete: ${analysis.rating}/5 stars`, {
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Analysis failed', error);
      toast.error(error.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setAnalysisFeedback('');
    }
  };

  const handleAnalyzeClick = () => {
    // Show input dialog first
    setShowAnalysisInput(true);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const handleCritiqueFeedback = async (isHelpful: boolean) => {
    if (isHelpful) {
      setCritiqueFeedbackGiven('positive');
      // Submit positive feedback
      try {
        const res = await fetch(`${apiUrl}/api/process/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: 'generation-analysis',
            isHelpful: true,
            aiReasoning: JSON.stringify({
              advice: analysis?.advice || '',
              flaws: analysis?.flaws || [],
              rating: analysis?.rating,
            }),
            imageDescription: generation.inputPrompt,
          }),
        });
        if (!res.ok) throw new Error('Failed to submit feedback');
        const data = await res.json();
        toast.success(data.message || 'Thank you for the feedback!');
      } catch (e) {
        console.error('Failed to submit feedback:', e);
        toast.error('Failed to submit feedback');
        setCritiqueFeedbackGiven(null); // Reset on error
      }
    } else {
      setCritiqueFeedbackGiven('negative');
      setShowCritiqueCorrection(true);
    }
  };

  const submitCritiqueCorrection = async () => {
    if (!critiqueCorrection.trim()) {
      setShowCritiqueCorrection(false);
      setCritiqueFeedbackGiven(null);
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const res = await fetch(`${apiUrl}/api/process/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'generation-analysis',
          isHelpful: false,
          aiReasoning: JSON.stringify({
            advice: analysis?.advice || '',
            flaws: analysis?.flaws || [],
            rating: analysis?.rating,
          }),
          userCorrection: critiqueCorrection,
          imageDescription: generation.inputPrompt,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit correction');
      const data = await res.json();
      toast.success(data.message || 'We will learn from this correction!');
      setShowCritiqueCorrection(false);
      setCritiqueCorrection('');
    } catch (e) {
      console.error('Failed to submit correction:', e);
      toast.error('Failed to submit correction');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const analysis =
    typeof generation.aiAnalysis === 'string'
      ? JSON.parse(generation.aiAnalysis)
      : generation.aiAnalysis;

  // Parse failure reason and provide actionable advice with model-specific context
  const getFailureAdvice = (
    reason: string | undefined,
    modelId?: string,
    usedLoras?: any
  ): {
    category: string;
    advice: string;
    icon: string;
    modelTips?: string[];
    constraintViolations?: string[];
  } => {
    if (!reason)
      return {
        category: 'Unknown Error',
        advice: 'Try generating again with the same settings.',
        icon: '❓',
      };

    const lowerReason = reason.toLowerCase();
    let modelTips: string[] = [];
    let constraintViolations: string[] = [];

    // Get model constraints if we have a model ID
    if (modelId) {
      const constraints = getModelConstraints(modelId);
      modelTips = getModelTips(modelId);

      // Check for constraint violations based on settings
      const loraCount = usedLoras?.loras?.length || 0;
      const referenceCount = usedLoras?.referenceCount || 0;

      constraintViolations = getConstraintViolations(modelId, {
        loraCount,
        referenceCount,
        hasNegativePrompt: !!usedLoras?.negativePrompt,
        hasCFG: usedLoras?.guidanceScale !== undefined,
      });

      // LoRA-specific errors with model context
      if (
        lowerReason.includes('lora') ||
        lowerReason.includes('adapter') ||
        lowerReason.includes('weight')
      ) {
        if (!constraints.supportsLoRA) {
          return {
            category: 'LoRA Not Supported',
            advice: `This model (${modelId.split('/').pop()}) does not support LoRAs. Remove all LoRAs and try again, or switch to a model like Flux Dev or SD 3.5 that supports LoRAs.`,
            icon: '🎚️',
            modelTips,
            constraintViolations: [`Model doesn't support LoRAs - you have ${loraCount} active`],
          };
        }
        if (constraints.maxLoRAs && loraCount > constraints.maxLoRAs) {
          return {
            category: 'Too Many LoRAs',
            advice: `This model supports maximum ${constraints.maxLoRAs} LoRAs, but you have ${loraCount}. Remove ${loraCount - constraints.maxLoRAs} LoRA(s) or reduce their strengths.`,
            icon: '🎚️',
            modelTips,
            constraintViolations: [`Max ${constraints.maxLoRAs} LoRAs, you have ${loraCount}`],
          };
        }
        return {
          category: 'LoRA Error',
          advice:
            'There was an issue loading one of your LoRAs. Try disabling some LoRAs, reducing their strength, or check if the LoRA is compatible with this model.',
          icon: '🎚️',
          modelTips,
        };
      }

      // Reference/IP-Adapter errors
      if (
        lowerReason.includes('reference') ||
        lowerReason.includes('ip-adapter') ||
        lowerReason.includes('image input') ||
        lowerReason.includes('control image')
      ) {
        if (constraints.maxReferences !== undefined) {
          if (referenceCount > constraints.maxReferences) {
            return {
              category: 'Too Many References',
              advice: `This model accepts maximum ${constraints.maxReferences} reference image(s), but you provided ${referenceCount}. Remove extra references.`,
              icon: '🖼️',
              modelTips,
              constraintViolations: [
                `Max ${constraints.maxReferences} references, you have ${referenceCount}`,
              ],
            };
          }
          if (constraints.minReferences && referenceCount < constraints.minReferences) {
            return {
              category: 'Missing Reference',
              advice: `This model requires at least ${constraints.minReferences} reference image(s). Add a character or pose reference to continue.`,
              icon: '🖼️',
              modelTips,
              constraintViolations: [
                `Requires ${constraints.minReferences} reference(s), you have ${referenceCount}`,
              ],
            };
          }
        }
        if (
          !constraints.supportsIPAdapter &&
          (lowerReason.includes('ip-adapter') || lowerReason.includes('face'))
        ) {
          return {
            category: 'IP-Adapter Not Supported',
            advice:
              'This model does not support IP-Adapter/face references. Try Flux Dev, SD 3.5, or a model with built-in character consistency like Flux Kontext.',
            icon: '👤',
            modelTips,
          };
        }
      }

      // NSFW with model-specific advice
      if (
        lowerReason.includes('nsfw') ||
        lowerReason.includes('safety') ||
        lowerReason.includes('content policy') ||
        lowerReason.includes('blocked') ||
        lowerReason.includes('inappropriate')
      ) {
        const nsfwStrength = constraints.nsfwStrength || 'moderate';
        let modelAdvice = '';

        if (nsfwStrength === 'strict') {
          modelAdvice =
            'This model has a STRICT content filter. Consider switching to Flux Dev, SD 3.5, or a local ComfyUI model for more permissive content.';
        } else if (nsfwStrength === 'moderate') {
          modelAdvice =
            'Try using more neutral language. Avoid suggestive poses or explicit descriptions. Some keywords may trigger the filter unexpectedly.';
        } else {
          modelAdvice =
            'Even permissive models have some limits. Check your prompt for prohibited terms.';
        }

        return {
          category: 'Content Policy',
          advice: modelAdvice,
          icon: '🚫',
          modelTips:
            nsfwStrength === 'strict'
              ? ['This model has strict content filtering', ...modelTips]
              : modelTips,
        };
      }
    }

    // Rate limiting / Quota
    if (
      lowerReason.includes('rate limit') ||
      lowerReason.includes('quota') ||
      lowerReason.includes('too many requests') ||
      lowerReason.includes('429')
    ) {
      return {
        category: 'Rate Limited',
        advice:
          'Wait 1-2 minutes before trying again. High-demand models like Kling and Luma have stricter rate limits. Consider switching to a faster model like Flux Schnell temporarily.',
        icon: '⏱️',
        modelTips,
      };
    }

    // Timeout
    if (
      lowerReason.includes('timeout') ||
      lowerReason.includes('timed out') ||
      lowerReason.includes('deadline')
    ) {
      return {
        category: 'Timeout',
        advice:
          'The generation took too long. Try: reducing inference steps (25-30), using a smaller resolution, switching to a faster model (Flux Schnell, LTX-Video), or simplifying your prompt.',
        icon: '⏰',
        modelTips,
      };
    }

    // Model not found / Invalid
    if (
      lowerReason.includes('model not found') ||
      lowerReason.includes('invalid model') ||
      lowerReason.includes('not available') ||
      lowerReason.includes('deprecated')
    ) {
      return {
        category: 'Model Unavailable',
        advice:
          'This model may be temporarily unavailable, deprecated, or renamed. Select a different model from the engine selector. Check if the provider is experiencing issues.',
        icon: '🔧',
        modelTips,
      };
    }

    // Memory / GPU
    if (
      lowerReason.includes('memory') ||
      lowerReason.includes('gpu') ||
      lowerReason.includes('cuda') ||
      lowerReason.includes('out of memory') ||
      lowerReason.includes('oom')
    ) {
      return {
        category: 'Out of Memory',
        advice:
          'The server ran out of GPU memory. Try: smaller resolution (720p instead of 1080p), fewer inference steps (25-30), fewer LoRAs, or a less demanding model. For video, try shorter duration (3-5 seconds).',
        icon: '💾',
        modelTips,
      };
    }

    // Network / Connection
    if (
      lowerReason.includes('network') ||
      lowerReason.includes('connection') ||
      lowerReason.includes('fetch') ||
      lowerReason.includes('econnrefused') ||
      lowerReason.includes('socket')
    ) {
      return {
        category: 'Network Error',
        advice:
          'Connection issue with the AI provider. Check your internet connection, wait a moment, and try again. The provider may be experiencing temporary issues.',
        icon: '🌐',
        modelTips,
      };
    }

    // Invalid aspect ratio
    if (
      lowerReason.includes('aspect ratio') ||
      lowerReason.includes('resolution') ||
      lowerReason.includes('size') ||
      lowerReason.includes('dimension')
    ) {
      return {
        category: 'Invalid Resolution',
        advice:
          'The aspect ratio or resolution is not supported by this model. Try standard ratios like 16:9, 9:16, 4:3, or 1:1. Some models have specific resolution requirements.',
        icon: '📐',
        modelTips,
      };
    }

    // Invalid input / parameters
    if (
      lowerReason.includes('invalid') ||
      lowerReason.includes('parameter') ||
      lowerReason.includes('validation')
    ) {
      return {
        category: 'Invalid Settings',
        advice:
          'One of your generation settings is invalid. Check: seed (use -1 for random), CFG scale (typically 3-7), steps (25-50), and ensure all required fields are filled.',
        icon: '⚙️',
        modelTips,
      };
    }

    // Generic server error
    if (
      lowerReason.includes('500') ||
      lowerReason.includes('server error') ||
      lowerReason.includes('internal') ||
      lowerReason.includes('503') ||
      lowerReason.includes('502')
    ) {
      return {
        category: 'Server Error',
        advice:
          'The AI provider encountered an internal error. This is usually temporary. Wait 30 seconds and try again. If it persists, try a different provider or model.',
        icon: '🖥️',
        modelTips,
      };
    }

    // Authentication
    if (
      lowerReason.includes('auth') ||
      lowerReason.includes('api key') ||
      lowerReason.includes('unauthorized') ||
      lowerReason.includes('401') ||
      lowerReason.includes('403')
    ) {
      return {
        category: 'Authentication Error',
        advice:
          'API key issue with this provider. Check that your API key is valid and has sufficient credits. Contact support if the issue persists.',
        icon: '🔑',
        modelTips,
      };
    }

    // Prompt too long
    if (
      lowerReason.includes('prompt') &&
      (lowerReason.includes('long') ||
        lowerReason.includes('length') ||
        lowerReason.includes('token'))
    ) {
      return {
        category: 'Prompt Too Long',
        advice:
          'Your prompt exceeds the maximum length. Shorten your prompt by removing redundant details, combining similar concepts, or using more concise language.',
        icon: '📝',
        modelTips,
      };
    }

    // Default with model context
    return {
      category: 'Generation Failed',
      advice:
        'Try generating again. If the issue persists, try a different model, simplify your prompt, or reduce the number of references/LoRAs.',
      icon: '⚠️',
      modelTips,
      constraintViolations,
    };
  };

  // Get model ID from usedLoras if available
  const modelId = generation.usedLoras?.model;
  const failureInfo =
    generation.status === 'failed'
      ? getFailureAdvice(generation.failureReason, modelId, generation.usedLoras)
      : null;

  // Proxy Placeholder: Estimate generation time based on model
  const getEstimatedTime = (
    model?: string
  ): { label: string; isVideo: boolean; isSlow: boolean } => {
    if (!model) return { label: '~30s', isVideo: false, isSlow: false };

    const lowerModel = model.toLowerCase();

    // Premium video models - 1-5 minutes
    if (lowerModel.includes('kling') || lowerModel.includes('veo') || lowerModel.includes('luma')) {
      return { label: '2-5 min', isVideo: true, isSlow: true };
    }
    if (
      lowerModel.includes('wan') ||
      lowerModel.includes('minimax') ||
      lowerModel.includes('ltx')
    ) {
      return { label: '1-3 min', isVideo: true, isSlow: true };
    }

    // Image models
    if (lowerModel.includes('flux')) {
      return { label: '~15s', isVideo: false, isSlow: false };
    }
    if (lowerModel.includes('sd') || lowerModel.includes('stable')) {
      return { label: '~10s', isVideo: false, isSlow: false };
    }

    // Default
    return { label: '~30s', isVideo: false, isSlow: false };
  };

  const estimatedTime = getEstimatedTime(modelId);
  const elapsedSeconds = Math.floor((Date.now() - new Date(generation.createdAt).getTime()) / 1000);
  const elapsedDisplay =
    elapsedSeconds < 60
      ? `${elapsedSeconds}s`
      : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;

  // Reset edited prompt when popup opens/closes or generation changes
  useEffect(() => {
    setEditedPrompt(generation.inputPrompt);
    setIsEditing(false);
  }, [generation.inputPrompt, showPopup]);

  const [showStatus, setShowStatus] = useState(() => {
    if (generation.status !== 'succeeded') return true;
    // Only show if created in the last 10 seconds
    return Date.now() - new Date(generation.createdAt).getTime() < 10000;
  });

  useEffect(() => {
    if (generation.status === 'succeeded') {
      const timer = setTimeout(() => setShowStatus(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowStatus(true);
    }
  }, [generation.status]);

  const output = generation.outputs?.[0];
  const isVideo = output?.type === 'video';
  const rawUrl = output?.url;
  const mediaUrl =
    rawUrl && typeof rawUrl === 'string'
      ? rawUrl.startsWith('http') || rawUrl.startsWith('data:')
        ? rawUrl
        : `http://localhost:3001${rawUrl}`
      : undefined;

  // Hover-Scrub: Move mouse horizontally to scrub through video frames
  const handleVideoScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isVideo || !videoRef.current || !videoContainerRef.current) return;

    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));

    // Update scrub indicator position
    setScrubPosition(percentage);

    // Seek video to corresponding time
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  // Reset video on mouse leave
  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (!isHovered) {
        videoRef.current.currentTime = 0;
        setScrubPosition(0);
      }
    }
  }, [isHovered, isVideo]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaUrl) {
      try {
        // Fetch the file and download it properly
        const response = await fetch(mediaUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generation-${generation.id}.${isVideo ? 'mp4' : 'png'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Optional: success toast could go here
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback to direct link
        const a = document.createElement('a');
        a.href = mediaUrl;
        a.download = `generation-${generation.id}.${isVideo ? 'mp4' : 'png'}`;
        a.target = '_blank'; // Safety fallback
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // TODO: Add toast.error("Download failed") here when toast provider is available
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(generation.id);
    setShowDeleteConfirm(false);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(generation.id, { isFavorite: !generation.isFavorite });
  };

  const handleIterate = () => {
    onIterate(editedPrompt);
    setShowPopup(false);
  };

  const handleUpdatePrompt = () => {
    onUpdate(generation.id, { inputPrompt: editedPrompt });
    setIsEditing(false);
  };

  const handleUpscale = (e: React.MouseEvent, model: string) => {
    e.stopPropagation();
    if (mediaUrl && onUpscale) {
      onUpscale(mediaUrl, model);
    }
    setShowUpscaleMenu(false);
  };

  return (
    <TooltipProvider>
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={clsx(
          'group @container relative cursor-pointer touch-none rounded-xl border bg-white/5 transition-all',
          isSelected
            ? 'border-blue-500 ring-1 ring-blue-500'
            : 'border-white/10 hover:border-blue-500/50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={e => {
          if (onToggleSelection && (e.ctrlKey || e.metaKey || isSelected)) {
            e.stopPropagation();
            onToggleSelection(e);
          } else if (generation.status === 'succeeded' || generation.status === 'failed') {
            setShowPopup(true);
          }
        }}
      >
        <div
          className="@container relative overflow-hidden rounded-t-xl bg-black/50"
          style={{ aspectRatio: generation.aspectRatio?.replace(':', '/') || '16/9' }}
        >
          {/* FULL WIDTH TOOLBAR: Inside image container with container-relative sizing */}
          <div
            className={clsx(
              'absolute z-20 flex items-center justify-between transition-opacity duration-200',
              'top-[clamp(6px,2cqh,12px)] right-[clamp(6px,2cqw,12px)] left-[clamp(6px,2cqw,12px)]',
              isHovered || isSelected || generation.isFavorite || showUpscaleMenu || showEnhanceMenu
                ? 'opacity-100'
                : 'opacity-0'
            )}
          >
            {/* LEFT: Selection Checkbox + Favorite Heart */}
            <div className="flex items-center gap-[clamp(4px,1.2cqw,8px)]">
              {onToggleSelection && (
                <div
                  onClick={e => {
                    e.stopPropagation();
                    onToggleSelection(e);
                  }}
                  className={clsx(
                    'flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] cursor-pointer items-center justify-center rounded border-2 backdrop-blur-sm transition-colors',
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-white/60 bg-black/40 hover:border-white hover:bg-black/60'
                  )}
                >
                  {isSelected && <Check className="h-[60%] w-[60%] text-white" />}
                </div>
              )}
              {generation.status === 'succeeded' && (
                <button
                  onClick={toggleFavorite}
                  className={clsx(
                    'flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded backdrop-blur-sm transition-colors',
                    generation.isFavorite ? 'bg-red-500/80' : 'bg-black/40 hover:bg-red-500/50'
                  )}
                >
                  <Heart
                    className={clsx(
                      'h-[60%] w-[60%]',
                      generation.isFavorite ? 'fill-white text-white' : 'text-white'
                    )}
                  />
                </button>
              )}
            </div>

            {/* RIGHT: Action Buttons */}
            <div className="flex items-center gap-[clamp(4px,1.2cqw,8px)]">
              {/* Fullscreen (Success only) */}
              {generation.status === 'succeeded' && (
                <Tooltip content="Fullscreen" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowPopup(true);
                      setIsFullscreen(true);
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-white/20"
                    aria-label="View fullscreen"
                  >
                    <Maximize2 className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Upscale (Success + Image only) - Radix Portal Dropdown */}
              {generation.status === 'succeeded' && !isVideo && onUpscale && (
                <DropdownMenu.Root open={showUpscaleMenu} onOpenChange={setShowUpscaleMenu}>
                  <Tooltip content="Upscale" side="top">
                    <DropdownMenu.Trigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-green-600/80 backdrop-blur-sm transition-colors hover:bg-green-500"
                        aria-label="Upscale image"
                      >
                        <ZoomIn className="h-[60%] w-[60%] text-white" />
                      </button>
                    </DropdownMenu.Trigger>
                  </Tooltip>

                  <AnimatePresence>
                    {showUpscaleMenu && (
                      <DropdownMenu.Portal forceMount>
                        <DropdownMenu.Content
                          asChild
                          side="top"
                          align="end"
                          sideOffset={6}
                          onClick={e => e.stopPropagation()}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="z-[9999] w-44 overflow-hidden rounded-lg border border-white/20 bg-[#1a1a1a] shadow-xl"
                          >
                            {UPSCALE_OPTIONS.map((option, idx) => (
                              <DropdownMenu.Item key={option.id} asChild>
                                <button
                                  onClick={e => handleUpscale(e, option.id)}
                                  className={clsx(
                                    'w-full px-3 py-2 text-left transition-colors outline-none hover:bg-green-500/20',
                                    idx < UPSCALE_OPTIONS.length - 1 && 'border-b border-white/5'
                                  )}
                                >
                                  <div className="text-sm font-medium text-white">
                                    {option.name}
                                  </div>
                                  <div className="text-[10px] text-gray-500">
                                    {option.description}
                                  </div>
                                </button>
                              </DropdownMenu.Item>
                            ))}
                          </motion.div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    )}
                  </AnimatePresence>
                </DropdownMenu.Root>
              )}

              {/* Animate (Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && onAnimate && (
                <Tooltip content="Animate" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (mediaUrl) onAnimate(mediaUrl);
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-purple-600/80 backdrop-blur-sm transition-colors hover:bg-purple-500"
                    aria-label="Animate image"
                  >
                    <Play className="h-[60%] w-[60%] fill-current text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Find Similar Composition (Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && onFindSimilarComposition && (
                <Tooltip content="Find Similar Composition" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onFindSimilarComposition(generation.id);
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-purple-500/50"
                    aria-label="Find images with similar framing and composition"
                  >
                    <Layers className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Find Similar Lighting (Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && onFindSimilarLighting && (
                <Tooltip content="Find Similar Lighting" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onFindSimilarLighting(generation.id);
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-amber-500/50"
                    aria-label="Find images with similar lighting setup"
                  >
                    <Sun className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Find Similar Visual (CLIP Vector - Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && onFindSimilarVisual && (
                <Tooltip content="Find Similar (AI Vision)" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onFindSimilarVisual(generation.id);
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-cyan-500/50"
                    aria-label="Find visually similar images using AI"
                  >
                    <Eye className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Enhance Video Menu (Success + Video only) - Radix Portal Dropdown */}
              {generation.status === 'succeeded' && isVideo && onEnhanceVideo && (
                <DropdownMenu.Root open={showEnhanceMenu} onOpenChange={setShowEnhanceMenu}>
                  <Tooltip content="Enhance video" side="top">
                    <DropdownMenu.Trigger asChild>
                      <button
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm transition-colors hover:from-purple-500 hover:to-pink-500 focus:ring-2 focus:ring-purple-400 focus:outline-none"
                        aria-label="Enhance video options"
                      >
                        <Wand2 className="h-[60%] w-[60%] text-white" />
                      </button>
                    </DropdownMenu.Trigger>
                  </Tooltip>

                  <AnimatePresence>
                    {showEnhanceMenu && (
                      <DropdownMenu.Portal forceMount>
                        <DropdownMenu.Content
                          asChild
                          side="top"
                          align="end"
                          sideOffset={8}
                          onClick={e => e.stopPropagation()}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="z-[9999] min-w-[180px] overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-xl"
                          >
                            {ENHANCE_ITEMS.map((item, idx) => (
                              <DropdownMenu.Item key={item.mode} asChild>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    onEnhanceVideo(generation.id, item.mode);
                                    setShowEnhanceMenu(false);
                                  }}
                                  className={clsx(
                                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white outline-none hover:bg-purple-600/50',
                                    idx < ENHANCE_ITEMS.length - 1 && 'border-b border-gray-700'
                                  )}
                                >
                                  <span className="text-lg">{item.emoji}</span>
                                  <div>
                                    <div className="font-medium">{item.title}</div>
                                    <div className="text-xs text-gray-400">{item.description}</div>
                                  </div>
                                </button>
                              </DropdownMenu.Item>
                            ))}
                          </motion.div>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    )}
                  </AnimatePresence>
                </DropdownMenu.Root>
              )}

              {/* Roto & Paint (Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && mediaUrl && (
                <Tooltip content="Roto & Paint" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      // Encode the URL for safe passing via query params
                      const encodedUrl = encodeURIComponent(mediaUrl);
                      router.push(
                        `/projects/${generation.projectId}/process?url=${encodedUrl}&tool=eraser`
                      );
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-orange-600/80 backdrop-blur-sm transition-colors hover:bg-orange-500"
                    aria-label="Edit in Roto & Paint"
                  >
                    <Paintbrush className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Set Extension / Outpaint (Success + Image only) */}
              {generation.status === 'succeeded' && !isVideo && mediaUrl && (
                <Tooltip content="Set Extension" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const encodedUrl = encodeURIComponent(mediaUrl);
                      router.push(
                        `/projects/${generation.projectId}/process?url=${encodedUrl}&tool=extend`
                      );
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-teal-600/80 backdrop-blur-sm transition-colors hover:bg-teal-500"
                    aria-label="Extend image (Infinite Canvas)"
                  >
                    <Expand className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Rotoscope (Success + Video only) */}
              {generation.status === 'succeeded' && isVideo && mediaUrl && (
                <Tooltip content="Rotoscope" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const encodedUrl = encodeURIComponent(mediaUrl);
                      router.push(
                        `/projects/${generation.projectId}/process?video=${encodedUrl}&tool=rotoscope`
                      );
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-cyan-600/80 backdrop-blur-sm transition-colors hover:bg-cyan-500"
                    aria-label="Edit in Rotoscope"
                  >
                    <Film className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Save as Element (Success only) */}
              {generation.status === 'succeeded' && onSaveAsElement && (
                <Tooltip content="Save as Element" side="top">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (mediaUrl) onSaveAsElement(mediaUrl, isVideo ? 'video' : 'image');
                    }}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-blue-500/50"
                    aria-label="Save as Element"
                  >
                    <FilePlus className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Download (Success only) */}
              {generation.status === 'succeeded' && (
                <Tooltip content="Download" side="top">
                  <button
                    onClick={handleDownload}
                    className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-white/20"
                    aria-label="Download media"
                  >
                    <Download className="h-[60%] w-[60%] text-white" />
                  </button>
                </Tooltip>
              )}

              {/* Delete (ALWAYS VISIBLE) */}
              <Tooltip content="Delete" side="top">
                <button
                  onClick={handleDelete}
                  className="flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded bg-black/50 backdrop-blur-sm transition-colors hover:bg-red-500/50"
                  aria-label="Delete generation"
                >
                  <Trash2 className="h-[60%] w-[60%] text-red-400" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Media content */}
          {generation.status === 'succeeded' && mediaUrl ? (
            isVideo ? (
              <div
                ref={videoContainerRef}
                className="relative h-full w-full"
                onMouseMove={handleVideoScrub}
              >
                <video
                  ref={videoRef}
                  src={mediaUrl}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onContextMenu={e => e.stopPropagation()}
                  onPointerDown={e => {
                    // Stop propagation for right click (button 2) to prevent dnd-kit from grabbing it
                    if (e.button === 2) {
                      e.stopPropagation();
                    }
                  }}
                />
                {/* Hover-Scrub Indicator */}
                {isHovered && (
                  <>
                    {/* Scrub position line */}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-white/80 transition-transform duration-75"
                      style={{ left: `${scrubPosition * 100}%` }}
                    />
                    {/* Progress bar at bottom */}
                    <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-1 bg-black/50">
                      <div
                        className="h-full bg-blue-500 transition-all duration-75"
                        style={{ width: `${scrubPosition * 100}%` }}
                      />
                    </div>
                    {/* Film strip icon indicator */}
                    <div className="pointer-events-none absolute right-2 bottom-2 z-10 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                      <Film className="h-3 w-3" />
                      <span>Scrub</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <img
                src={mediaUrl}
                className="h-full w-full object-cover"
                loading="lazy"
                onContextMenu={e => e.stopPropagation()}
                onPointerDown={e => {
                  // Stop propagation for right click (button 2) to prevent dnd-kit from grabbing it
                  if (e.button === 2) {
                    e.stopPropagation();
                  }
                }}
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {generation.status === 'queued' || generation.status === 'running' ? (
                /* Proxy Placeholder - Enhanced loading state */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800/50 to-zinc-900">
                  {/* Animated background effect for slow video models */}
                  {estimatedTime.isSlow && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-blue-500/5 to-transparent" />
                      <div
                        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/3 to-transparent"
                        style={{
                          animation: 'shimmer 2s infinite',
                          left: '-33%',
                        }}
                      />
                    </div>
                  )}

                  {/* Main spinner */}
                  <div className="relative">
                    <Loader2
                      className={clsx(
                        'animate-spin',
                        estimatedTime.isSlow ? 'h-10 w-10 text-purple-400' : 'h-8 w-8 text-blue-500'
                      )}
                    />
                    {estimatedTime.isVideo && (
                      <Film className="absolute -right-1 -bottom-1 h-4 w-4 text-purple-300" />
                    )}
                  </div>

                  {/* Status and time info */}
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-white/80 capitalize">
                      {generation.status === 'queued' ? 'In Queue' : 'Generating'}
                    </span>

                    {/* Model name badge */}
                    {modelId && (
                      <span className="max-w-[120px] truncate text-[10px] text-gray-500">
                        {modelId.split('/').pop()?.split('-').slice(0, 2).join('-')}
                      </span>
                    )}

                    {/* Time display */}
                    <div className="mt-1 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-gray-500" />
                      <span className="text-[10px] text-gray-400">
                        {elapsedDisplay} / {estimatedTime.label}
                      </span>
                    </div>

                    {/* Slow model warning */}
                    {estimatedTime.isSlow && elapsedSeconds > 60 && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-400/70">
                        <Zap className="h-2.5 w-2.5" />
                        <span>Premium model - please wait</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <span className="font-medium text-red-500">Failed</span>
                  {generation.failureReason && (
                    <span className="line-clamp-3 text-[10px] leading-tight text-red-400/80">
                      {generation.failureReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          <AnimatePresence>
            {showStatus && generation.status !== 'failed' && generation.status !== 'succeeded' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-black/60 px-2 py-1 text-xs text-white capitalize backdrop-blur-md"
              >
                {generation.status}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-3">
          <p className="line-clamp-2 text-sm text-gray-300">{generation.inputPrompt}</p>
          <div className="mt-2 text-xs text-gray-500">
            {new Date(generation.createdAt).toLocaleTimeString()}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium text-white">Delete this generation?</p>
            <div className="flex gap-2">
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="rounded bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popup Modal */}
      <AnimatePresence>
        {showPopup && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
            onClick={() => {
              setShowPopup(false);
              setIsFullscreen(false);
            }}
          >
            {(() => {
              // Determine if vertical layout is needed
              const isVertical = generation.aspectRatio
                ? generation.aspectRatio.includes(':')
                  ? parseInt(generation.aspectRatio.split(':')[1]) >
                    parseInt(generation.aspectRatio.split(':')[0])
                  : generation.aspectRatio.startsWith('portrait') ||
                    generation.aspectRatio === '9:16'
                : false;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`relative flex w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl ${
                    isVertical ? 'h-[85vh] max-w-7xl flex-row' : 'max-h-[90vh] max-w-5xl flex-col'
                  }`}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Top buttons row */}
                  <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                    <Tooltip content={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} side="top">
                      <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-white/20"
                      >
                        <Maximize2 className="h-5 w-5" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Close" side="top">
                      <button
                        onClick={() => {
                          setShowPopup(false);
                          setIsFullscreen(false);
                        }}
                        className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-white/20"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </Tooltip>
                  </div>

                  {/* Fullscreen mode - just show the image/video */}
                  {isFullscreen ? (
                    <div
                      className="flex h-full w-full items-center justify-center bg-black"
                      onClick={() => setIsFullscreen(false)}
                    >
                      {isVideo ? (
                        <video
                          src={mediaUrl}
                          controls
                          autoPlay
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <img src={mediaUrl} className="max-h-full max-w-full object-contain" />
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        className={`flex items-center justify-center overflow-hidden bg-black ${
                          isVertical ? 'h-full w-2/3' : 'w-full flex-1'
                        }`}
                      >
                        {generation.status === 'failed' ? (
                          <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="mb-4 text-6xl">{failureInfo?.icon}</div>
                            <h3 className="mb-2 text-xl font-bold text-red-400">
                              {failureInfo?.category}
                            </h3>
                            <p className="max-w-md text-sm text-gray-400">{failureInfo?.advice}</p>
                          </div>
                        ) : isVideo ? (
                          <video
                            src={mediaUrl}
                            controls
                            autoPlay
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <img src={mediaUrl} className="h-full w-full object-contain" />
                        )}
                      </div>

                      <div
                        className={`border-white/10 bg-[#1a1a1a] ${
                          isVertical
                            ? 'h-full w-1/3 overflow-y-auto border-l p-6'
                            : 'w-full border-t p-6'
                        }`}
                      >
                        {/* Failed Generation Details Panel */}
                        {generation.status === 'failed' ? (
                          <div>
                            <div className="mb-4 flex items-center justify-between">
                              <h3 className="text-lg font-bold text-white">What Went Wrong</h3>
                              <div className="flex gap-3">
                                {/* Copy Recipe Button */}
                                <Tooltip content="Copy recipe as JSON" side="top">
                                  <button
                                    onClick={handleCopyRecipe}
                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                  </button>
                                </Tooltip>
                                {/* Fork Recipe Button */}
                                {onUseSettings && (
                                  <Tooltip content="Fork this recipe - load settings and retry" side="top">
                                    <button
                                      onClick={handleRestoreSettings}
                                      className={clsx(
                                        'flex items-center gap-1.5 text-sm font-medium transition-all duration-200',
                                        isRestoring
                                          ? 'scale-105 text-green-400'
                                          : 'text-purple-400 hover:text-purple-300'
                                      )}
                                    >
                                      {isRestoring ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Forked!
                                        </>
                                      ) : (
                                        <>
                                          <GitFork className="h-3.5 w-3.5" />
                                          Fork & Retry
                                        </>
                                      )}
                                    </button>
                                  </Tooltip>
                                )}
                              </div>
                            </div>

                            {/* Raw Error Message */}
                            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                              <span className="mb-1 block text-xs font-medium text-red-400">
                                Error Details
                              </span>
                              <p className="font-mono text-sm break-words text-gray-300">
                                {generation.failureReason || 'No error details available'}
                              </p>
                            </div>

                            {/* Prompt Used */}
                            <div className="mb-4">
                              <span className="mb-1 block text-xs text-gray-500">Prompt Used</span>
                              <p className="text-sm text-gray-400">{generation.inputPrompt}</p>
                            </div>

                            {/* Constraint Violations */}
                            {failureInfo?.constraintViolations &&
                              failureInfo.constraintViolations.length > 0 && (
                                <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                                  <div className="mb-2 flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                    <span className="text-sm font-medium text-yellow-300">
                                      Model Constraints Violated
                                    </span>
                                  </div>
                                  <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                                    {failureInfo.constraintViolations.map((v, i) => (
                                      <li key={i}>{v}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                            {/* Quick Fix Suggestions */}
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
                              <div className="mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4 text-blue-400" />
                                <span className="text-sm font-medium text-blue-300">
                                  Suggested Fix
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">{failureInfo?.advice}</p>
                            </div>

                            {/* Model Tips */}
                            {failureInfo?.modelTips && failureInfo.modelTips.length > 0 && (
                              <div className="mt-4 rounded-lg border border-purple-500/20 bg-purple-500/10 p-3">
                                <div className="mb-2 flex items-center gap-2">
                                  <Sparkles className="h-4 w-4 text-purple-400" />
                                  <span className="text-sm font-medium text-purple-300">
                                    Model Notes
                                  </span>
                                </div>
                                <ul className="list-inside list-disc space-y-1 text-xs text-gray-400">
                                  {failureInfo.modelTips.map((tip, i) => (
                                    <li key={i}>{tip}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Generation Metadata for Failed */}
                            <div className="mt-6 border-t border-white/10 pt-4">
                              <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                Settings Used
                              </h4>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="mb-1 block text-gray-500">Provider</span>
                                  <span className="text-white capitalize">
                                    {generation.usedLoras?.provider || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Model</span>
                                  <span className="break-all text-white">
                                    {generation.usedLoras?.model || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Resolution</span>
                                  <span className="text-white">
                                    {generation.aspectRatio || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Created</span>
                                  <span className="text-white">
                                    {new Date(generation.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Successful Generation Details Panel */
                          <>
                            <div className="mb-4 flex items-center justify-between">
                              <h3 className="text-lg font-bold text-white">Generation Details</h3>
                              <div className="flex gap-3">
                                {/* Copy Recipe Button */}
                                <Tooltip content="Copy recipe as JSON" side="top">
                                  <button
                                    onClick={handleCopyRecipe}
                                    className="flex items-center gap-1.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                  </button>
                                </Tooltip>
                                {/* Fork Recipe Button */}
                                {onUseSettings && (
                                  <Tooltip content="Fork this recipe - load exact settings into generator" side="top">
                                    <button
                                      onClick={handleRestoreSettings}
                                      className={clsx(
                                        'flex items-center gap-1.5 text-sm font-medium transition-all duration-200',
                                        isRestoring
                                          ? 'scale-105 text-green-400'
                                          : 'text-purple-400 hover:text-purple-300'
                                      )}
                                    >
                                      {isRestoring ? (
                                        <>
                                          <Check className="h-3.5 w-3.5" />
                                          Forked!
                                        </>
                                      ) : (
                                        <>
                                          <GitFork className="h-3.5 w-3.5" />
                                          Fork Recipe
                                        </>
                                      )}
                                    </button>
                                  </Tooltip>
                                )}
                                <button
                                  onClick={() => setIsEditing(!isEditing)}
                                  className="text-sm font-medium text-blue-400 hover:text-blue-300"
                                >
                                  {isEditing ? 'Cancel Edit' : 'Iterate Prompt'}
                                </button>
                              </div>
                            </div>

                            {isEditing ? (
                              <div className="space-y-4">
                                <textarea
                                  value={editedPrompt}
                                  onChange={e => setEditedPrompt(e.target.value)}
                                  className="h-32 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                  placeholder="Edit your prompt..."
                                />
                                <div className="flex justify-end gap-3">
                                  <button
                                    onClick={handleUpdatePrompt}
                                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                                  >
                                    Update Current
                                  </button>

                                  <button
                                    onClick={handleIterate}
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-500"
                                  >
                                    Generate New
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="mb-4 text-gray-400">{generation.inputPrompt}</p>
                                {generation.usedLoras?.negativePrompt && (
                                  <div className="mb-4 border-t border-white/5 pt-3">
                                    <span className="mb-1 block text-xs text-gray-500">
                                      Negative Prompt
                                    </span>
                                    <p className="font-mono text-[10px] break-words text-gray-400 italic">
                                      {generation.usedLoras.negativePrompt}
                                    </p>
                                  </div>
                                )}
                                <button
                                  onClick={handleSmartRefine}
                                  disabled={isRefining}
                                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-600/20 py-2 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-600/30 disabled:opacity-50"
                                >
                                  {isRefining ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                  Smart Refine (Vision)
                                </button>

                                {/* Analyze Failure Button */}
                                {!analysis &&
                                  generation.status === 'succeeded' &&
                                  !showAnalysisInput && (
                                    <button
                                      onClick={handleAnalyzeClick}
                                      disabled={isAnalyzing}
                                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20"
                                    >
                                      {isAnalyzing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <AlertTriangle className="h-4 w-4" />
                                      )}
                                      Analyze Failure
                                    </button>
                                  )}

                                {/* Analysis Feedback Input */}
                                {showAnalysisInput && (
                                  <div className="animate-in fade-in slide-in-from-top-2 mt-2 rounded-lg border border-red-500/20 bg-red-900/10 p-3 duration-200">
                                    <p className="mb-2 text-xs font-medium text-red-200">
                                      What seems to be wrong? (Optional)
                                    </p>
                                    <textarea
                                      value={analysisFeedback}
                                      onChange={e => setAnalysisFeedback(e.target.value)}
                                      className="mb-2 h-20 w-full resize-none rounded border border-white/10 bg-black/40 p-2 text-xs text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none"
                                      placeholder="E.g. The eyes are asymmetrical..."
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setShowAnalysisInput(false)}
                                        className="px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={confirmAnalyze}
                                        className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-500"
                                      >
                                        {isAnalyzing && (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        )}
                                        Start Analysis
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Analysis Results Display */}
                                {analysis && (
                                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                                    <div className="mb-2 flex items-start justify-between">
                                      <h4 className="flex items-center gap-2 text-sm font-semibold text-red-200">
                                        <Lightbulb className="h-4 w-4" />
                                        AI Critique ({analysis.rating}/5)
                                      </h4>
                                    </div>

                                    <div className="space-y-3 text-xs">
                                      <div>
                                        <span className="block font-medium text-red-400">
                                          Flaws:
                                        </span>
                                        <ul className="list-inside list-disc pl-1 text-gray-300">
                                          {analysis.flaws?.map((flaw: string, i: number) => (
                                            <li key={i}>{flaw}</li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div>
                                        <span className="block font-medium text-green-400">
                                          Good:
                                        </span>
                                        <p className="text-gray-300">
                                          {analysis.positiveTraits?.join(', ')}
                                        </p>
                                      </div>

                                      <div className="border-t border-white/5 pt-2">
                                        <span className="block font-medium text-blue-300">
                                          Advice:
                                        </span>
                                        <p className="text-gray-300 italic">"{analysis.advice}"</p>
                                      </div>

                                      {/* Feedback Buttons */}
                                      <div className="mt-3 border-t border-white/10 pt-3">
                                        {critiqueFeedbackGiven ? (
                                          <div className="flex items-center gap-2 text-xs text-gray-400">
                                            {critiqueFeedbackGiven === 'positive' ? (
                                              <>
                                                <ThumbsUp className="h-3 w-3 text-green-400" />
                                                Thanks for the feedback!
                                              </>
                                            ) : (
                                              <>
                                                <ThumbsDown className="h-3 w-3 text-red-400" />
                                                We'll learn from this!
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">
                                              Was this helpful?
                                            </span>
                                            <Tooltip content="Yes, this was helpful" side="top">
                                              <button
                                                onClick={() => handleCritiqueFeedback(true)}
                                                className="rounded bg-green-500/10 p-1.5 text-green-400 transition-colors hover:bg-green-500/30"
                                              >
                                                <ThumbsUp className="h-3.5 w-3.5" />
                                              </button>
                                            </Tooltip>
                                            <Tooltip content="No, this was wrong" side="top">
                                              <button
                                                onClick={() => handleCritiqueFeedback(false)}
                                                className="rounded bg-red-500/10 p-1.5 text-red-400 transition-colors hover:bg-red-500/30"
                                              >
                                                <ThumbsDown className="h-3.5 w-3.5" />
                                              </button>
                                            </Tooltip>
                                          </div>
                                        )}

                                        {/* Correction Input */}
                                        {showCritiqueCorrection && (
                                          <div className="animate-in fade-in slide-in-from-top-2 mt-3 duration-200">
                                            <textarea
                                              value={critiqueCorrection}
                                              onChange={e => setCritiqueCorrection(e.target.value)}
                                              className="h-16 w-full resize-none rounded border border-white/10 bg-black/50 p-2 text-xs text-white placeholder:text-gray-500 focus:border-red-500/50 focus:outline-none"
                                              placeholder="What was wrong with this analysis?"
                                              autoFocus
                                            />
                                            <div className="mt-2 flex gap-2">
                                              <button
                                                onClick={() => {
                                                  setShowCritiqueCorrection(false);
                                                  setCritiqueFeedbackGiven(null);
                                                }}
                                                className="px-2 py-1 text-xs text-gray-400 transition-colors hover:text-white"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={submitCritiqueCorrection}
                                                disabled={isSubmittingFeedback}
                                                className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                                              >
                                                {isSubmittingFeedback && (
                                                  <Loader2 className="h-3 w-3 animate-spin" />
                                                )}
                                                Submit
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Generation Metadata */}
                            <div className="mt-6 border-t border-white/10 pt-4">
                              <h4 className="mb-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                                Generation Details
                              </h4>
                              <div
                                className={`grid gap-4 text-xs ${isVertical ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}
                              >
                                <div>
                                  <span className="mb-1 block text-gray-500">Provider</span>
                                  <span className="text-white capitalize">
                                    {generation.usedLoras?.provider || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Model</span>
                                  <span className="break-all text-white">
                                    {generation.usedLoras?.model || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Resolution</span>
                                  <span className="text-white">
                                    {generation.aspectRatio || 'Unknown'}
                                  </span>
                                </div>
                                <div>
                                  <span className="mb-1 block text-gray-500">Seed</span>
                                  <span className="font-mono text-white">
                                    {generation.usedLoras?.seed || 'Random'}
                                  </span>
                                </div>

                                {generation.usedLoras?.sampler && (
                                  <div>
                                    <span className="mb-1 block text-gray-500">Sampler</span>
                                    <span className="text-white">
                                      {typeof generation.usedLoras.sampler === 'object'
                                        ? (generation.usedLoras.sampler as any).name ||
                                          (generation.usedLoras.sampler as any).value
                                        : generation.usedLoras.sampler}
                                    </span>
                                  </div>
                                )}

                                {generation.usedLoras?.scheduler && (
                                  <div>
                                    <span className="mb-1 block text-gray-500">Scheduler</span>
                                    <span className="text-white">
                                      {typeof generation.usedLoras.scheduler === 'object'
                                        ? (generation.usedLoras.scheduler as any).name ||
                                          (generation.usedLoras.scheduler as any).value
                                        : generation.usedLoras.scheduler}
                                    </span>
                                  </div>
                                )}

                                {generation.usedLoras?.steps && (
                                  <div>
                                    <span className="mb-1 block text-gray-500">Steps</span>
                                    <span className="text-white">{generation.usedLoras.steps}</span>
                                  </div>
                                )}

                                {generation.usedLoras?.guidanceScale && (
                                  <div>
                                    <span className="mb-1 block text-gray-500">CFG</span>
                                    <span className="text-white">
                                      {generation.usedLoras.guidanceScale}
                                    </span>
                                  </div>
                                )}

                                {generation.usedLoras?.strength !== undefined && (
                                  <div>
                                    <span className="mb-1 block text-gray-500">Denoise</span>
                                    <span className="text-white">
                                      {Number(generation.usedLoras.strength).toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {generation.usedLoras?.referenceStrengths &&
                                  Object.keys(generation.usedLoras.referenceStrengths).length >
                                    0 && (
                                    <div className="col-span-2">
                                      <span className="mb-1 block text-gray-500">
                                        Ref Strengths
                                      </span>
                                      <div className="flex flex-col gap-1">
                                        {Object.entries(
                                          generation.usedLoras.referenceStrengths
                                        ).map(([id, str]: [string, any]) => {
                                          const element = elements?.find(e => e.id === id);
                                          const name = element
                                            ? element.name
                                            : id.substring(0, 6) + '...';
                                          return (
                                            <div
                                              key={id}
                                              className="flex items-center justify-between rounded bg-white/5 px-2 py-0.5 text-[10px] text-gray-400"
                                            >
                                              <Tooltip content={element?.name || id} side="left">
                                                <span className="max-w-[80px] truncate">
                                                  {name}
                                                </span>
                                              </Tooltip>
                                              <span className="ml-2 text-gray-300">
                                                {Number(str).toFixed(2)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                              </div>

                              {generation.usedLoras?.loras &&
                                generation.usedLoras.loras.length > 0 && (
                                  <div className="mt-4 border-t border-white/5 pt-3">
                                    <span className="mb-2 block text-xs text-gray-500">
                                      Active LoRAs
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                      {generation.usedLoras.loras.map((lora: any, idx: number) => (
                                        <div
                                          key={idx}
                                          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-300"
                                        >
                                          {lora.name || lora.path?.split('/').pop() || lora.id}
                                          <span className="ml-1 text-gray-500">
                                            ({lora.strength})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </>
    </TooltipProvider>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Settings,
  Wand2,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Zap,
  User,
  ExternalLink,
  Palette,
  Camera,
  Layers,
  RefreshCw,
  Search,
  Plus,
  X,
  Lightbulb,
  Target,
  Sliders,
  Library,
  Image as ImageIcon,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { NegativePromptManager } from './NegativePromptManager';
import { TagSelectorModal } from '@/components/generation/TagSelectorModal';
import { Tag } from '@/components/tag-system';
import { clsx } from 'clsx';
import { fetchAPI, resolveFileUrl } from '@/lib/api';
import { useDebouncedCallback } from 'use-debounce';
import { getLoRACompatibility, getModelConstraints } from '@/lib/ModelConstraints';

// ==================== TYPES ====================

interface ModelGuide {
  id: string;
  name: string;
  provider: string;
  type: 'image' | 'video' | 'both';
  syntaxStyle: 'natural' | 'tags' | 'weighted' | 'structured';
  maxLength?: number;
  supportsWeights: boolean;
  supportsNegative: boolean;
  qualityBoosters: string[];
  template: string;
}

interface LoRAItem {
  id: string;
  name: string;
  triggerWords: string[];
  aliasPatterns?: string[]; // Custom aliases for prompt detection
  activationText?: string;
  type: 'character' | 'style' | 'concept' | 'clothing' | 'pose';
  baseModel: string;
  recommendedStrength: number;
  thumbnailUrl?: string;
  useCount: number;
  tagDefinitions?: Record<string, string>; // tag -> description
}

interface ElementItem {
  id: string;
  name: string;
  type: 'character' | 'prop' | 'location' | 'style';
  description: string;
  imageUrl?: string;
  consistencyWeight: number;
  attributes?: {
    physicalFeatures?: string[];
    clothing?: string[];
    accessories?: string[];
  };
}

interface EnhancedResult {
  prompt: string;
  negativePrompt?: string;
  components: {
    triggerWords: string[];
    characterDescription: string;
    qualityBoosters: string[];
    consistencyKeywords: string[];
  };
  recommendations: {
    cfgScale?: number;
    steps?: number;
    sampler?: string;
    scheduler?: string;
    loras?: string[];
    loraStrengths?: Record<string, number>;
  };
  analysis: {
    modelUsed: string;
    syntaxStyle: string;
    characterConsistencyScore: number;
    promptComplexity: number;
  };
}

interface SmartSuggestion {
  loraName: string;
  tag: string;
  description: string;
  trigger: string;
}

interface LoRAMatch {
  id: string;
  name: string;
  baseModel: string;
  triggerWords: string[];
  thumbnailUrl?: string;
  source: 'project' | 'global';
}

interface LoRASuggestionMatch {
  suggestion: string;
  hasLocalMatches: boolean;
  localMatches: LoRAMatch[];
  civitaiSearchUrl: string;
}

interface PropItem {
  id: string;
  name: string;
  description: string;
  referenceImageUrl?: string;
  category?: string;
}

interface PromptBuilderProps {
  initialPrompt?: string;
  modelId: string;
  generationType: 'image' | 'video';
  // For frame prompts in storyboard: the video model that will use this frame
  // Allows AI to optimize frame prompts for specific video model characteristics
  videoModelId?: string;
  elements?: ElementItem[];
  selectedElementIds?: string[]; // IDs of elements already selected in toolbar (read-only display)
  initialLoRAs?: LoRAItem[];
  initialImages?: string[];
  // Prop Bin items for object consistency
  props?: PropItem[];
  // Virtual Gaffer lighting setup (generated prompt modifier)
  lightingPrompt?: string;
  onPromptChange: (prompt: string, negativePrompt?: string) => void;
  onRecommendationsChange?: (recommendations: EnhancedResult['recommendations']) => void;
  onScriptParsed?: (prompts: { visual: string; motion: string; audio: string }) => void;
  onClose?: () => void;
}

// Note: Elements are displayed read-only from selectedElementIds.
// To change element selection, use the toolbar's element picker.

// ==================== MAIN COMPONENT ====================

export function PromptBuilder({
  initialPrompt = '',
  modelId,
  generationType,
  videoModelId,
  elements = [],
  selectedElementIds = [],
  initialLoRAs = [],
  initialImages = [],
  props = [],
  lightingPrompt = '',
  onPromptChange,
  onRecommendationsChange,
  onScriptParsed,
  onClose,
}: PromptBuilderProps) {
  // State
  const [prompt, setPrompt] = useState(initialPrompt);
  const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedResult | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhanced, setShowEnhanced] = useState(false);

  const [copied, setCopied] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [consistencyPriority, setConsistencyPriority] = useState(0.7);
  const [enhancementLevel, setEnhancementLevel] = useState<'minimal' | 'balanced' | 'aggressive'>(
    'balanced'
  );
  const [addQualityBoosters, setAddQualityBoosters] = useState(true);
  const [addNegativePrompt, setAddNegativePrompt] = useState(true);

  // Model info
  const [modelGuide, setModelGuide] = useState<ModelGuide | null>(null);

  // LoRAs
  const [selectedLoRAs, setSelectedLoRAs] = useState<LoRAItem[]>(initialLoRAs);
  const [showLoRASearch, setShowLoRASearch] = useState(false);
  const [loraSearchQuery, setLoraSearchQuery] = useState('');
  const [loraSearchResults, setLoraSearchResults] = useState<LoRAItem[]>([]);
  const [isSearchingLoRAs, setIsSearchingLoRAs] = useState(false);

  // Elements - use the selectedElementIds directly from props (read-only display)
  const selectedElements = selectedElementIds;
  const [primaryCharacterId, setPrimaryCharacterId] = useState<string | undefined>();

  // Camera (for video)
  const [cameraMovement, setCameraMovement] = useState('');
  const [cameraAngle, setCameraAngle] = useState('');
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');

  // Negative Prompt
  const [customNegativePrompt, setCustomNegativePrompt] = useState('');
  const [showNegativePromptLibrary, setShowNegativePromptLibrary] = useState(false);

  // Tags
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);

  // Vision / Image Input
  const [images, setImages] = useState<string[]>(initialImages);

  const [isDragging, setIsDragging] = useState(false);

  // Smart Suggestions
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);

  // LoRA Recommendation Matches (local LoRAs matching AI suggestions)
  const [loraMatches, setLoraMatches] = useState<LoRASuggestionMatch[]>([]);
  const [isMatchingLoRAs, setIsMatchingLoRAs] = useState(false);

  // Detect Smart Suggestions
  useEffect(() => {
    if (!prompt) {
      setSuggestions([]);
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    const found: SmartSuggestion[] = [];

    selectedLoRAs.forEach(lora => {
      if (!lora.tagDefinitions) return;

      Object.entries(lora.tagDefinitions).forEach(([tag, desc]) => {
        const lowerDesc = desc.toLowerCase();
        // Check if the prompt contains the description text (e.g. "full body image")
        // And ensure the tag isn't already used
        if (lowerPrompt.includes(lowerDesc) && !lowerPrompt.includes(tag.toLowerCase())) {
          found.push({
            loraName: lora.name,
            tag,
            description: desc,
            trigger: desc,
          });
        }
      });
    });

    setSuggestions(found.slice(0, 3)); // Limit to 3
  }, [prompt, selectedLoRAs]);

  const applySuggestion = (s: SmartSuggestion) => {
    // Replace the description with the tag, or append the tag?
    // User likely wants to replace "full body" with "pussy_scale1"
    // But safe bet is append if unsure, or replace if exact match.
    // Let's do a smart replace.
    const regex = new RegExp(s.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newPrompt = prompt.replace(regex, s.tag);
    setPrompt(newPrompt);
    onPromptChange(newPrompt);
    setSuggestions(prev => prev.filter(x => x !== s));
  };

  // ==================== EFFECTS ====================

  // Fetch model guide
  useEffect(() => {
    if (modelId) {
      fetchAPI(`/prompts/models/${encodeURIComponent(modelId)}`)
        .then(setModelGuide)
        .catch(console.error);
    }
  }, [modelId]);

  // Auto-select character elements
  useEffect(() => {
    const characterElements = elements.filter(e => e.type === 'character');
    if (characterElements.length > 0 && !primaryCharacterId) {
      setPrimaryCharacterId(characterElements[0].id);
    }
  }, [elements, primaryCharacterId]);

  // ==================== HANDLERS ====================

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;

    // Max 3 images
    if (images.length >= 3) return;

    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        setImages(prev => [...prev, e.target!.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files?.[0]) {
      handleImageUpload(e.clipboardData.files[0]);
    }
  };

  const enhance = useCallback(async () => {
    if (!prompt?.trim()) return;

    setIsEnhancing(true);

    try {
      const selectedElementObjects = elements.filter(e => selectedElements.includes(e.id));

      const result = await fetchAPI('/prompts/enhance', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          modelId,
          generationType,
          videoModelId, // For frame prompts: the video model that will consume this frame
          elements: selectedElementObjects,
          primaryCharacterId,
          loraIds: selectedLoRAs.map(l => l.id),
          loras: selectedLoRAs.map(l => ({
            id: l.id,
            name: l.name,
            triggerWords: l.triggerWords || [],
            aliasPatterns: l.aliasPatterns || [],
            type: l.type,
            strength: l.recommendedStrength,
          })),
          style,
          mood,
          cameraMovement: generationType === 'video' ? cameraMovement : undefined,
          cameraAngle: generationType === 'video' ? cameraAngle : undefined,
          enhancementLevel,
          preserveOriginalIntent: true,
          addQualityBoosters,
          addNegativePrompt,
          customNegativePrompt,
          consistencyPriority,
          images: [
            ...images.map(img => resolveFileUrl(img)),
            ...selectedElementObjects.map(e => resolveFileUrl(e.imageUrl)).filter((url): url is string => !!url),
            // Include prop reference images
            ...props.filter(p => p.referenceImageUrl).map(p => resolveFileUrl(p.referenceImageUrl!)),
          ], // Combine manual uploads + element images + prop images (resolved to full URLs)
          // Prop Bin items for object consistency
          props: props.map(p => ({
            name: p.name,
            description: p.description,
            category: p.category,
          })),
          // Virtual Gaffer lighting setup
          lightingPrompt: lightingPrompt || undefined,
        }),
      });

      setEnhancedPrompt(result);
      setShowEnhanced(true);

      // Update local prompt state to show enhanced version
      if (result?.prompt) {
        setPrompt(result.prompt);
      }

      // Match AI-suggested LoRAs to local installed LoRAs
      if (result?.recommendations?.loras && result.recommendations.loras.length > 0) {
        matchLoRASuggestions(result.recommendations.loras);
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      // Assuming we have a toast or alert system, or just log for now
      // If we had the toast hook, we would use it here.
      // For now, we'll reset enhancement state so user can try again.
    } finally {
      setIsEnhancing(false);
    }
  }, [
    prompt,
    modelId,
    generationType,
    videoModelId,
    elements,
    selectedElements,
    primaryCharacterId,
    selectedLoRAs,
    style,
    mood,
    cameraMovement,
    cameraAngle,
    enhancementLevel,
    addQualityBoosters,
    addNegativePrompt,
    customNegativePrompt,
    consistencyPriority,
    onPromptChange,
    onRecommendationsChange,
    props,
    lightingPrompt,
  ]);

  // Debounced auto-enhance on significant changes
  const debouncedEnhance = useDebouncedCallback(enhance, 1000);

  // Search LoRAs
  const searchLoRAs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setLoraSearchResults([]);
      return;
    }

    setIsSearchingLoRAs(true);

    try {
      // Search local first
      const localResults = await fetchAPI(`/prompts/loras?search=${encodeURIComponent(query)}`);
      setLoraSearchResults(localResults.loras || []);
    } catch (error) {
      console.error('LoRA search failed:', error);
    } finally {
      setIsSearchingLoRAs(false);
    }
  }, []);

  const debouncedLoRASearch = useDebouncedCallback(searchLoRAs, 300);

  useEffect(() => {
    debouncedLoRASearch(loraSearchQuery);
  }, [loraSearchQuery, debouncedLoRASearch]);

  const addLoRA = (lora: LoRAItem) => {
    if (!selectedLoRAs.find(l => l.id === lora.id)) {
      setSelectedLoRAs(prev => [...prev, lora]);
    }
    setShowLoRASearch(false);
    setLoraSearchQuery('');
  };

  const removeLoRA = (loraId: string) => {
    setSelectedLoRAs(prev => prev.filter(l => l.id !== loraId));
  };

  // Match AI-suggested LoRA styles to local installed LoRAs
  const matchLoRASuggestions = async (suggestions: string[]) => {
    if (!suggestions || suggestions.length === 0) return;

    setIsMatchingLoRAs(true);

    try {
      const result = await fetchAPI('/prompts/loras/match-suggestions', {
        method: 'POST',
        body: JSON.stringify({
          suggestions,
          baseModel: modelId, // Filter by compatible base model
        }),
      });

      if (result?.matches) {
        setLoraMatches(result.matches);
      }
    } catch (error) {
      console.error('Failed to match LoRA suggestions:', error);
      // Fallback: show all suggestions with CivitAI links only
      setLoraMatches(
        suggestions.map(s => ({
          suggestion: s,
          hasLocalMatches: false,
          localMatches: [],
          civitaiSearchUrl: `https://civitai.com/search/models?query=${encodeURIComponent(s)}&types=LORA`,
        }))
      );
    } finally {
      setIsMatchingLoRAs(false);
    }
  };

  // Add a matched LoRA to selection
  const addLoRAFromMatch = (match: LoRAMatch) => {
    // Check if already selected
    if (selectedLoRAs.some(l => l.id === match.id)) return;

    const newLoRA: LoRAItem = {
      id: match.id,
      name: match.name,
      triggerWords: match.triggerWords,
      type: 'style',
      baseModel: match.baseModel,
      recommendedStrength: 0.8,
      useCount: 0,
    };

    setSelectedLoRAs(prev => [...prev, newLoRA]);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useEnhancedPrompt = () => {
    if (enhancedPrompt) {
      setPrompt(enhancedPrompt.prompt);
      onPromptChange(enhancedPrompt.prompt, enhancedPrompt.negativePrompt);
      if (onClose) onClose();
    }
  };

  // ==================== COMPUTED ====================

  const triggerWordsPreview = useMemo(() => {
    return selectedLoRAs.flatMap(l => l.triggerWords).slice(0, 5);
  }, [selectedLoRAs]);

  const characterElements = useMemo(() => elements.filter(e => e.type === 'character'), [elements]);

  const promptLength = prompt?.length || 0;
  const isOverLimit = modelGuide?.maxLength && promptLength > modelGuide.maxLength;

  // ==================== RENDER ====================

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 bg-white/5 p-3 pr-12">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-bold text-white">Smart Prompt Builder</span>
          {modelGuide && (
            <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
              {modelGuide.name}
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          {/* Consistency Priority Badge */}
          <div className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-1 text-[10px]">
            <Target className="h-3 w-3 text-purple-400" />
            <span className="text-purple-400">
              Consistency: {Math.round(consistencyPriority * 100)}%
            </span>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={clsx(
              'rounded p-1.5 transition-colors',
              showSettings ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'
            )}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-3 border-b border-white/10 bg-white/5 p-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Consistency Priority */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Character Consistency Priority
              </label>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={consistencyPriority}
                onChange={e => setConsistencyPriority(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>Flexible</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Enhancement Level */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                Enhancement Level
              </label>
              <div className="flex gap-1">
                {(['minimal', 'balanced', 'aggressive'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setEnhancementLevel(level)}
                    className={clsx(
                      'flex-1 rounded px-2 py-1 text-[10px] transition-colors',
                      enhancementLevel === level
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-400 hover:bg-white/20'
                    )}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={addQualityBoosters}
                onChange={e => setAddQualityBoosters(e.target.checked)}
                className="rounded border-gray-600"
              />
              <span className="text-xs text-gray-300">Add quality boosters</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={addNegativePrompt}
                onChange={e => setAddNegativePrompt(e.target.checked)}
                className="rounded border-gray-600"
              />
              <span className="text-xs text-gray-300">Generate negative prompt</span>
            </label>
          </div>
        </div>
      )}

      {/* LoRA Section */}
      <div className="border-b border-white/10 p-3">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            <Layers className="h-3 w-3" />
            LoRA Models & Trigger Words
          </label>
          <button
            onClick={() => setShowLoRASearch(!showLoRASearch)}
            className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"
          >
            <Plus className="h-3 w-3" />
            Add LoRA
          </button>
        </div>

        {/* Selected LoRAs */}
        {selectedLoRAs.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedLoRAs.map(lora => {
              const compatibility = getLoRACompatibility(lora.baseModel, lora.name, modelId);
              const isIncompatible = !compatibility.compatible;

              return (
                <div
                  key={lora.id}
                  className={clsx(
                    'group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors',
                    isIncompatible
                      ? 'border border-orange-500/40 bg-orange-500/15 hover:border-orange-500/60'
                      : 'border border-purple-500/30 bg-purple-500/10 hover:border-purple-500/50'
                  )}
                  title={isIncompatible ? compatibility.message : undefined}
                >
                  {isIncompatible && (
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                  )}
                  <div className="flex flex-col">
                    <span
                      className={clsx(
                        'text-xs font-semibold tracking-wide',
                        isIncompatible ? 'text-orange-300' : 'text-white'
                      )}
                    >
                      {lora.name}
                    </span>
                    {lora.triggerWords && lora.triggerWords.length > 0 && (
                      <span
                        className={clsx(
                          'mt-0.5 block font-mono text-[10px]',
                          isIncompatible ? 'text-orange-400/70' : 'text-purple-300'
                        )}
                      >
                        {lora.triggerWords[0]}
                      </span>
                    )}
                    {isIncompatible && (
                      <span className="mt-0.5 text-[9px] text-orange-400">
                        {lora.baseModel} LoRA
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeLoRA(lora.id)}
                    className="ml-1 p-0.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-2 text-[10px] text-gray-500 italic">No LoRAs selected.</p>
        )}

        {/* LoRA Compatibility Warning Banner */}
        {selectedLoRAs.some(
          lora => !getLoRACompatibility(lora.baseModel, lora.name, modelId).compatible
        ) && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
            <div className="flex-1">
              <span className="block text-[10px] font-medium text-orange-300">
                Incompatible LoRA(s) detected
              </span>
              <span className="text-[10px] text-orange-400/80">
                Some LoRAs are trained for different base models and may not work correctly. Check
                the model requirements or switch to a compatible generation model.
              </span>
            </div>
          </div>
        )}

        {/* Trigger Words Preview */}
        {triggerWordsPreview.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Zap className="h-3 w-3 text-yellow-400" />
            <span>Will prepend:</span>
            <code className="rounded bg-yellow-500/20 px-1 py-0.5 text-yellow-400">
              {triggerWordsPreview.join(', ')}
            </code>
          </div>
        )}

        {/* LoRA Search */}
        {showLoRASearch && (
          <div className="mt-2 rounded-lg bg-white/5 p-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={loraSearchQuery}
                onChange={e => setLoraSearchQuery(e.target.value)}
                placeholder="Search LoRAs by name or trigger word..."
                className="w-full rounded border border-white/10 bg-white/5 py-1.5 pr-3 pl-8 text-xs text-white placeholder-gray-500"
              />
            </div>

            {isSearchingLoRAs ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : loraSearchResults.length > 0 ? (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {loraSearchResults.map(lora => (
                  <button
                    key={lora.id}
                    onClick={() => addLoRA(lora)}
                    className="flex w-full items-center gap-2 rounded bg-white/5 p-2 text-left transition-colors hover:bg-white/10"
                  >
                    {lora.thumbnailUrl && (
                      <img
                        src={lora.thumbnailUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs text-white">{lora.name}</div>
                      <div className="truncate text-[10px] text-gray-400">
                        {lora.triggerWords.join(', ')}
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-[10px]',
                        lora.type === 'character'
                          ? 'bg-blue-500/20 text-blue-400'
                          : lora.type === 'style'
                            ? 'bg-pink-500/20 text-pink-400'
                            : 'bg-gray-500/20 text-gray-400'
                      )}
                    >
                      {lora.type}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              loraSearchQuery && (
                <p className="py-2 text-center text-[10px] text-gray-500">No LoRAs found</p>
              )
            )}
          </div>
        )}
      </div>

      {/* References Section - Elements + Manual Uploads */}
      <div className="border-b border-white/10 p-3">
        <label className="mb-2 block flex items-center gap-1 text-[10px] font-bold tracking-wider text-gray-400 uppercase">
          <User className="h-3 w-3" />
          References
        </label>
        <div className="flex flex-wrap gap-2">
          {/* Elements from Toolbar */}
          {elements
            .filter(element => selectedElements.includes(element.id))
            .map(element => (
              <div
                key={element.id}
                onClick={() => {
                  if (element.type === 'character') {
                    setPrimaryCharacterId(element.id);
                  }
                }}
                className={clsx(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition-all',
                  element.type === 'character'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : element.type === 'style'
                      ? 'border-pink-500 bg-pink-500/20 text-white'
                      : 'border-green-500 bg-green-500/20 text-white'
                )}
              >
                {element.imageUrl && (
                  <img src={element.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
                )}
                <span className="text-xs">{element.name}</span>
                <span
                  className={clsx(
                    'rounded px-1 py-0.5 text-[9px]',
                    element.type === 'character'
                      ? 'bg-blue-500/20 text-blue-400'
                      : element.type === 'style'
                        ? 'bg-pink-500/20 text-pink-400'
                        : element.type === 'prop'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                  )}
                >
                  {element.type}
                </span>
                {primaryCharacterId === element.id && (
                  <span className="rounded bg-yellow-500/20 px-1 py-0.5 text-[9px] text-yellow-400">
                    PRIMARY
                  </span>
                )}
              </div>
            ))}

          {/* Manual Uploads */}
          {images.map((img, idx) => (
            <div key={idx} className="group relative inline-block">
              <img
                src={img}
                alt={`Ref ${idx + 1}`}
                className="h-9 w-auto rounded border border-white/20 object-cover"
              />
              <button
                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}

          {/* Add Reference Button */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={clsx(
              'flex h-9 cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-1.5 transition-all',
              isDragging
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            )}
            onClick={() => document.getElementById('vision-upload')?.click()}
          >
            <div className="flex items-center gap-1">
              <Plus className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] text-gray-500">Add Ref</span>
            </div>
            <input
              id="vision-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </div>
        </div>
      </div>

      {/* Tags Section */}
      <div className="border-t border-white/10 p-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Tags
          </label>
          <button
            onClick={() => setIsTagSelectorOpen(true)}
            className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300"
          >
            <Library className="h-3 w-3" />
            Library
          </button>
        </div>
        <div className="min-h-[56px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 focus-within:border-amber-500/50">
          {selectedTags.length === 0 ? (
            <p className="text-sm text-gray-500">Click Library to add tags to your prompt...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedTags.map(tag => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: tag.color || '#6B7280' }}
                >
                  {tag.name}
                  <button
                    onClick={() => setSelectedTags(prev => prev.filter(t => t.id !== tag.id))}
                    className="rounded-full p-0.5 transition-colors hover:bg-white/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
            Your Prompt
          </label>
          <div className="flex items-center gap-2">
            <span className={clsx('text-[10px]', isOverLimit ? 'text-red-400' : 'text-gray-500')}>
              {promptLength}
              {modelGuide?.maxLength ? `/ ${modelGuide.maxLength} ` : ''} chars
            </span>
            {modelGuide && (
              <span className="text-[10px] text-gray-500">({modelGuide.syntaxStyle} syntax)</span>
            )}
          </div>
        </div>

        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onPaste={handlePaste}
          placeholder="Describe what you want to generate (or paste an image for analysis)..."
          rows={4}
          className={clsx(
            'w-full resize-none rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500',
            isOverLimit ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
          )}
        />

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 mb-2 w-full px-3">
            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-1 rounded-lg border border-purple-500/30 bg-[#1a1a1a] p-2 shadow-xl">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-wider text-purple-400 uppercase">
                <Sparkles className="h-3 w-3" />
                <span>Smart Suggestions</span>
              </div>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => applySuggestion(s)}
                  className="group flex w-full items-center justify-between rounded border border-purple-500/20 bg-purple-500/10 p-2 text-left transition-colors hover:bg-purple-500/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-300">
                      Replace <span className="font-medium text-white">"{s.trigger}"</span> with
                    </span>
                    <code className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-xs text-purple-300">
                      {s.tag}
                    </code>
                  </div>
                  <span className="text-[10px] text-gray-500 group-hover:text-gray-400">
                    from {s.loraName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Model-specific hints */}
        {modelGuide && (
          <div className="mt-2 flex items-start gap-2 text-[10px] text-gray-500">
            <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0 text-yellow-400" />
            <span>
              {modelGuide.syntaxStyle === 'weighted' &&
                'Tip: Use (term:1.2) to emphasize important features'}
              {modelGuide.syntaxStyle === 'tags' &&
                'Tip: Use comma-separated tags like danbooru style'}
              {modelGuide.syntaxStyle === 'natural' &&
                'Tip: Write detailed natural language descriptions'}
              {modelGuide.syntaxStyle === 'structured' &&
                'Tip: Use [camera commands] in brackets for video'}
            </span>
          </div>
        )}
      </div>

      {/* Negative Prompt Section */}
      {addNegativePrompt && (
        <div className="border-t border-white/10 p-3">
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
              Negative Prompt
            </label>
            <button
              onClick={() => setShowNegativePromptLibrary(true)}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300"
            >
              <Library className="h-3 w-3" />
              Library
            </button>
          </div>
          <textarea
            value={customNegativePrompt}
            onChange={e => setCustomNegativePrompt(e.target.value)}
            placeholder="Describe what you DON'T want (e.g. blurry, text, bad anatomy)..."
            rows={2}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none"
          />
        </div>
      )}

      {/* Enhanced Result */}
      {enhancedPrompt && showEnhanced && (
        <div className="border-t border-white/10">
          <div className="bg-gradient-to-b from-purple-500/10 to-transparent p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-bold text-white">Enhanced Prompt</span>
                <span
                  className={clsx(
                    'rounded px-2 py-0.5 text-[10px]',
                    enhancedPrompt.analysis.characterConsistencyScore >= 80
                      ? 'bg-green-500/20 text-green-400'
                      : enhancedPrompt.analysis.characterConsistencyScore >= 60
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                  )}
                >
                  Consistency: {enhancedPrompt.analysis.characterConsistencyScore}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip content="Copy to clipboard" side="top">
                  <button
                    onClick={() => copyToClipboard(enhancedPrompt.prompt)}
                    className="p-1.5 text-gray-400 transition-colors hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </Tooltip>
                <button
                  onClick={() => setShowEnhanced(false)}
                  className="p-1.5 text-gray-400 transition-colors hover:text-white"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Enhanced prompt display */}
            <div className="rounded-lg bg-white/5 p-3 text-sm whitespace-pre-wrap text-gray-200">
              {enhancedPrompt.prompt}
            </div>

            {/* Negative prompt */}
            {enhancedPrompt.negativePrompt && (
              <div className="mt-2">
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                  Negative Prompt
                </label>
                <div className="rounded-lg bg-red-500/10 p-2 text-xs whitespace-pre-wrap text-red-300">
                  {enhancedPrompt.negativePrompt}
                </div>
              </div>
            )}

            {/* Components breakdown */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {/* Only show trigger words if LoRAs are actually selected */}
              {selectedLoRAs.length > 0 && enhancedPrompt.components.triggerWords.length > 0 && (
                <div className="rounded-lg bg-yellow-500/10 p-2">
                  <span className="text-[10px] font-bold text-yellow-400">Trigger Words</span>
                  <div className="mt-1 text-[10px] text-yellow-300">
                    {enhancedPrompt.components.triggerWords.join(', ')}
                  </div>
                </div>
              )}
              {enhancedPrompt.components.qualityBoosters.length > 0 && (
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <span className="text-[10px] font-bold text-blue-400">Quality Terms</span>
                  <div className="mt-1 text-[10px] text-blue-300">
                    {enhancedPrompt.components.qualityBoosters.join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {(enhancedPrompt.recommendations.cfgScale || enhancedPrompt.recommendations.steps) && (
              <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                <Sliders className="h-3 w-3" />
                <span>Recommended:</span>
                {enhancedPrompt.recommendations.cfgScale && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5">
                    CFG: {enhancedPrompt.recommendations.cfgScale}
                  </span>
                )}
                {enhancedPrompt.recommendations.steps && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5">
                    Steps: {enhancedPrompt.recommendations.steps}
                  </span>
                )}
                {enhancedPrompt.recommendations.sampler && (
                  <span className="rounded bg-white/10 px-1.5 py-0.5">
                    {enhancedPrompt.recommendations.sampler}
                  </span>
                )}
              </div>
            )}

            {/* Recommended LoRAs - Now with Local Matches! */}
            {enhancedPrompt.recommendations.loras &&
              enhancedPrompt.recommendations.loras.length > 0 && (
                <div className="mt-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">
                      Recommended LoRAs
                    </span>
                    {isMatchingLoRAs && (
                      <RefreshCw className="h-3 w-3 animate-spin text-purple-400" />
                    )}
                  </div>

                  {/* Show matched results if available */}
                  {loraMatches.length > 0 ? (
                    <div className="space-y-2">
                      {loraMatches.map((match, idx) => (
                        <div key={idx} className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-purple-300">
                              {match.suggestion}
                            </span>
                            {!match.hasLocalMatches && (
                              <a
                                href={match.civitaiSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[9px] text-gray-500 transition-colors hover:text-purple-400"
                              >
                                Search CivitAI
                                <ExternalLink className="h-2 w-2" />
                              </a>
                            )}
                          </div>

                          {match.hasLocalMatches ? (
                            <div className="flex flex-wrap gap-1.5">
                              {match.localMatches.map(lora => {
                                const isAlreadySelected = selectedLoRAs.some(l => l.id === lora.id);
                                return (
                                  <button
                                    key={lora.id}
                                    onClick={() => !isAlreadySelected && addLoRAFromMatch(lora)}
                                    disabled={isAlreadySelected}
                                    className={clsx(
                                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] transition-all',
                                      isAlreadySelected
                                        ? 'cursor-default border border-green-500/40 bg-green-500/20 text-green-300'
                                        : 'border border-purple-500/30 bg-purple-500/15 text-purple-300 hover:border-purple-500/50 hover:bg-purple-500/25'
                                    )}
                                    title={isAlreadySelected ? 'Already added' : `Add ${lora.name}`}
                                  >
                                    {lora.source === 'project' && (
                                      <span className="rounded bg-blue-500/30 px-1 text-[8px] text-blue-300">
                                        Project
                                      </span>
                                    )}
                                    {lora.source === 'global' && (
                                      <span className="rounded bg-gray-500/30 px-1 text-[8px] text-gray-400">
                                        Global
                                      </span>
                                    )}
                                    <span className="font-medium">{lora.name}</span>
                                    {isAlreadySelected ? (
                                      <Check className="h-2.5 w-2.5 text-green-400" />
                                    ) : (
                                      <Plus className="h-2.5 w-2.5 opacity-60" />
                                    )}
                                  </button>
                                );
                              })}
                              {/* CivitAI fallback even when there are matches */}
                              <Tooltip content="Find more on CivitAI" side="top">
                                <a
                                  href={match.civitaiSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-300"
                                >
                                  More
                                  <ExternalLink className="h-2 w-2" />
                                </a>
                              </Tooltip>
                            </div>
                          ) : (
                            <div className="text-[9px] text-gray-500 italic">
                              No matching LoRAs installed - search CivitAI to find one
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Fallback: Original CivitAI-only links while matching */
                    <div className="flex flex-wrap gap-2">
                      {enhancedPrompt.recommendations.loras.map((lora, idx) => (
                        <a
                          key={idx}
                          href={`https://civitai.com/search/models?query=${encodeURIComponent(lora)}&types=LORA`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300 transition-colors hover:bg-purple-500/20 hover:text-purple-200"
                        >
                          {lora}
                          <ExternalLink className="h-2 w-2 opacity-50" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* LoRA Strength Recommendations */}
            {selectedLoRAs.length > 0 && (
              <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
                <span className="mb-2 block flex items-center gap-1 text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                  <Sliders className="h-3 w-3" />
                  Strength Adjustments
                </span>
                <div className="space-y-1">
                  {selectedLoRAs.map(lora => {
                    const recommendedStrength =
                      enhancedPrompt.recommendations.loraStrengths?.[lora.name] ??
                      enhancedPrompt.recommendations.loraStrengths?.[lora.id];
                    const hasChange =
                      recommendedStrength !== undefined &&
                      recommendedStrength !== lora.recommendedStrength;

                    return (
                      <div key={lora.id} className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-300">{lora.name}</span>
                        <div className="flex items-center gap-2">
                          {hasChange ? (
                            <>
                              <span className="text-gray-500 line-through">
                                {lora.recommendedStrength?.toFixed(2) || '1.00'}
                              </span>
                              <span className="font-mono font-bold text-blue-300">
                                {recommendedStrength?.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="font-mono text-gray-500">
                              {lora.recommendedStrength?.toFixed(2) || '1.00'} (Unchanged)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Additional Settings Recommendations */}
            {(enhancedPrompt.recommendations.scheduler ||
              enhancedPrompt.recommendations.sampler) && (
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-400">
                {enhancedPrompt.recommendations.scheduler && (
                  <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
                    <Layers className="h-3 w-3" />
                    Scheduler: {enhancedPrompt.recommendations.scheduler}
                  </span>
                )}
                {enhancedPrompt.recommendations.sampler && (
                  <span className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
                    <Zap className="h-3 w-3" />
                    Sampler: {enhancedPrompt.recommendations.sampler}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Footer - Single Enhance/Apply Button */}
      <div className="border-t border-white/10 bg-[#1a1a1a] p-4">
        <button
          onClick={() => {
            if (enhancedPrompt && showEnhanced) {
              // Apply enhanced prompt and close
              useEnhancedPrompt();
            } else {
              // Run enhancement
              enhance();
            }
          }}
          disabled={isEnhancing || !prompt.trim()}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all',
            prompt.trim()
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500'
              : 'cursor-not-allowed bg-white/5 text-gray-500'
          )}
        >
          {isEnhancing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Enhancing...
            </>
          ) : enhancedPrompt && showEnhanced ? (
            <>
              <Check className="h-4 w-4" />
              Use Enhanced Prompt
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Enhance
            </>
          )}
        </button>
      </div>

      {/* Negative Prompt Manager Modal */}
      <NegativePromptManager
        projectId="default" // You might want to pass a real projectId here if available in context
        isOpen={showNegativePromptLibrary}
        onClose={() => setShowNegativePromptLibrary(false)}
        currentPrompt={customNegativePrompt}
        onSelect={prompt => setCustomNegativePrompt(prompt)}
        onAppend={prompt => {
          const separator = customNegativePrompt.trim() ? ', ' : '';
          setCustomNegativePrompt((customNegativePrompt || '') + separator + prompt);
        }}
      />

      {/* Tag Selector Modal */}
      <TagSelectorModal
        isOpen={isTagSelectorOpen}
        onClose={() => setIsTagSelectorOpen(false)}
        onTagsApply={tags => setSelectedTags(tags)}
        initialTags={selectedTags}
      />
    </div>
  );
}

export default PromptBuilder;

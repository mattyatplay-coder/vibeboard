"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Sparkles, Settings, Wand2, Eye, EyeOff, Copy, Check,
    ChevronDown, ChevronUp, AlertCircle, Info, Zap, User, ExternalLink,
    Palette, Camera, Layers, RefreshCw, Search, Plus, X,
    Lightbulb, Target, Sliders, Library, Image as ImageIcon, Upload
} from "lucide-react";
import { NegativePromptManager } from "./NegativePromptManager";
import { clsx } from "clsx";
import { fetchAPI } from "@/lib/api";
import { useDebouncedCallback } from "use-debounce";
import { usePromptWeighting } from "@/hooks/usePromptWeighting";

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

interface PromptBuilderProps {
    initialPrompt?: string;
    modelId: string;
    generationType: 'image' | 'video';
    elements?: ElementItem[];
    initialLoRAs?: LoRAItem[];
    initialImages?: string[];
    onPromptChange: (prompt: string, negativePrompt?: string) => void;
    onRecommendationsChange?: (recommendations: EnhancedResult['recommendations']) => void;
    onScriptParsed?: (prompts: { visual: string; motion: string; audio: string }) => void;
    onClose?: () => void;
}

// ==================== MAIN COMPONENT ====================

export function PromptBuilder({
    initialPrompt = "",
    modelId,
    generationType,
    elements = [],
    initialLoRAs = [],
    initialImages = [],
    onPromptChange,
    onRecommendationsChange,
    onScriptParsed,
    onClose
}: PromptBuilderProps) {
    // State
    const [prompt, setPrompt] = useState(initialPrompt);
    const { handleKeyDown } = usePromptWeighting({
        value: prompt,
        onChange: setPrompt,
        onPropChange: onPromptChange
    });
    const [enhancedPrompt, setEnhancedPrompt] = useState<EnhancedResult | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [showEnhanced, setShowEnhanced] = useState(false);

    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<'standard' | 'script'>('standard');
    const [scriptText, setScriptText] = useState("");
    const [isParsingScript, setIsParsingScript] = useState(false);

    // Settings
    const [showSettings, setShowSettings] = useState(false);
    const [consistencyPriority, setConsistencyPriority] = useState(0.7);
    const [enhancementLevel, setEnhancementLevel] = useState<'minimal' | 'balanced' | 'aggressive'>('balanced');
    const [addQualityBoosters, setAddQualityBoosters] = useState(true);
    const [addNegativePrompt, setAddNegativePrompt] = useState(true);

    // Model info
    const [modelGuide, setModelGuide] = useState<ModelGuide | null>(null);

    // LoRAs
    const [selectedLoRAs, setSelectedLoRAs] = useState<LoRAItem[]>(initialLoRAs);
    const [showLoRASearch, setShowLoRASearch] = useState(false);
    const [loraSearchQuery, setLoraSearchQuery] = useState("");
    const [loraSearchResults, setLoraSearchResults] = useState<LoRAItem[]>([]);
    const [isSearchingLoRAs, setIsSearchingLoRAs] = useState(false);

    // Elements
    const [selectedElements, setSelectedElements] = useState<string[]>([]);
    const [primaryCharacterId, setPrimaryCharacterId] = useState<string | undefined>();

    // Camera (for video)
    const [cameraMovement, setCameraMovement] = useState("");
    const [cameraAngle, setCameraAngle] = useState("");
    const [style, setStyle] = useState("");
    const [mood, setMood] = useState("");

    // Negative Prompt
    const [customNegativePrompt, setCustomNegativePrompt] = useState("");
    const [showNegativePromptLibrary, setShowNegativePromptLibrary] = useState(false);

    // Vision / Image Input
    const [images, setImages] = useState<string[]>(initialImages);

    const [isDragging, setIsDragging] = useState(false);

    // Smart Suggestions
    const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);

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
                        trigger: desc
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

    // Auto-populate vision images from selected elements
    useEffect(() => {
        const elementImages = elements
            .map(e => e.imageUrl)
            .filter((url): url is string => !!url);

        if (elementImages.length > 0) {
            setImages(prev => {
                const newImages = [...prev];
                let changed = false;

                elementImages.forEach(url => {
                    if (!newImages.includes(url)) {
                        newImages.push(url);
                        changed = true;
                    }
                });

                return changed ? newImages : prev;
            });
        }
    }, [elements]);

    // ==================== HANDLERS ====================

    const handleImageUpload = (file: File) => {
        if (!file.type.startsWith('image/')) return;

        // Max 3 images
        if (images.length >= 3) return;

        const reader = new FileReader();
        reader.onload = (e) => {
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
            const selectedElementObjects = elements.filter(e =>
                selectedElements.includes(e.id)
            );

            const result = await fetchAPI('/prompts/enhance', {
                method: 'POST',
                body: JSON.stringify({
                    prompt,
                    modelId,
                    generationType,
                    elements: selectedElementObjects,
                    primaryCharacterId,
                    loraIds: selectedLoRAs.map(l => l.id),
                    loras: selectedLoRAs.map(l => ({
                        id: l.id,
                        name: l.name,
                        triggerWord: l.triggerWords?.[0] || ''
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
                    images // Send array of base64 images
                })
            });

            setEnhancedPrompt(result);
            setShowEnhanced(true);



        } catch (error) {
            console.error('Enhancement failed:', error);
            // Assuming we have a toast or alert system, or just log for now
            // If we had the toast hook, we would use it here.
            // For now, we'll reset enhancement state so user can try again.
        } finally {
            setIsEnhancing(false);
        }
    }, [
        prompt, modelId, generationType, elements, selectedElements,
        primaryCharacterId, selectedLoRAs, style, mood, cameraMovement,
        cameraAngle, enhancementLevel, addQualityBoosters, addNegativePrompt,
        customNegativePrompt, consistencyPriority, onPromptChange, onRecommendationsChange
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
        setLoraSearchQuery("");
    };

    const removeLoRA = (loraId: string) => {
        setSelectedLoRAs(prev => prev.filter(l => l.id !== loraId));
    };

    const toggleElement = (elementId: string) => {
        setSelectedElements(prev =>
            prev.includes(elementId)
                ? prev.filter(id => id !== elementId)
                : [...prev, elementId]
        );
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

    const characterElements = useMemo(() =>
        elements.filter(e => e.type === 'character'),
        [elements]
    );

    const promptLength = prompt?.length || 0;
    const isOverLimit = modelGuide?.maxLength && promptLength > modelGuide.maxLength;

    // ==================== RENDER ====================

    return (
        <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 p-3 border-b border-white/10 bg-white/5 pr-12">
                <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Smart Prompt Builder</span>
                    {modelGuide && (
                        <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                            {modelGuide.name}
                        </span>
                    )}
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2">
                    {/* Consistency Priority Badge */}
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded text-[10px]">
                        <Target className="w-3 h-3 text-purple-400" />
                        <span className="text-purple-400">
                            Consistency: {Math.round(consistencyPriority * 100)}%
                        </span>
                    </div>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={clsx(
                            "p-1.5 rounded transition-colors",
                            showSettings ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </div>


            {/* View Mode Toggles */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setViewMode('standard')}
                    className={clsx(
                        "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
                        viewMode === 'standard' ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                    )}
                >
                    Standard Builder
                </button>
                <button
                    onClick={() => setViewMode('script')}
                    className={clsx(
                        "flex-1 py-2 text-xs font-medium transition-colors border-b-2",
                        viewMode === 'script' ? "border-purple-500 text-white" : "border-transparent text-gray-400 hover:text-white"
                    )}
                >
                    Screenplay Mode
                </button>
            </div>

            {
                viewMode === 'script' ? (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                                Paste Screenplay / Script
                            </label>
                            <p className="text-[10px] text-gray-500">
                                Paste a scene from your screenplay. We'll extract the visual description, motion, and dialog to auto-configure the pipeline.
                            </p>
                            <textarea
                                value={scriptText}
                                onChange={(e) => setScriptText(e.target.value)}
                                placeholder="INT. BATHROOM - DAY..."
                                rows={12}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-600 font-mono resize-none focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={async () => {
                                if (!scriptText.trim()) return;
                                setIsParsingScript(true);
                                try {
                                    // TODO: Replace with actual LLM Service call used elsewhere
                                    // For now, simulating a parsed response or calling a new API endpoint
                                    const res = await fetchAPI('/prompts/parse-script', {
                                        method: 'POST',
                                        body: JSON.stringify({ script: scriptText })
                                    });
                                    if (onScriptParsed) {
                                        onScriptParsed(res);
                                    }
                                    if (onClose) onClose();
                                } catch (e) {
                                    console.error("Script parse failed", e);
                                } finally {
                                    setIsParsingScript(false);
                                }
                            }}
                            disabled={isParsingScript || !scriptText.trim()}
                            className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isParsingScript ? (
                                <>
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Parsing Script...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-3 h-3" />
                                    Generate Pipeline Prompts
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Settings Panel */}
                        {showSettings && (
                            <div className="p-3 border-b border-white/10 bg-white/5 space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Consistency Priority */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                            Character Consistency Priority
                                        </label>
                                        <input
                                            type="range"
                                            min="0.3"
                                            max="1"
                                            step="0.1"
                                            value={consistencyPriority}
                                            onChange={(e) => setConsistencyPriority(parseFloat(e.target.value))}
                                            className="w-full accent-purple-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500">
                                            <span>Flexible</span>
                                            <span>Strict</span>
                                        </div>
                                    </div>

                                    {/* Enhancement Level */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                            Enhancement Level
                                        </label>
                                        <div className="flex gap-1">
                                            {(['minimal', 'balanced', 'aggressive'] as const).map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => setEnhancementLevel(level)}
                                                    className={clsx(
                                                        "flex-1 py-1 px-2 text-[10px] rounded transition-colors",
                                                        enhancementLevel === level
                                                            ? "bg-purple-500 text-white"
                                                            : "bg-white/10 text-gray-400 hover:bg-white/20"
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
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={addQualityBoosters}
                                            onChange={(e) => setAddQualityBoosters(e.target.checked)}
                                            className="rounded border-gray-600"
                                        />
                                        <span className="text-xs text-gray-300">Add quality boosters</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={addNegativePrompt}
                                            onChange={(e) => setAddNegativePrompt(e.target.checked)}
                                            className="rounded border-gray-600"
                                        />
                                        <span className="text-xs text-gray-300">Generate negative prompt</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* LoRA Section */}
                        <div className="p-3 border-b border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Layers className="w-3 h-3" />
                                    LoRA Models & Trigger Words
                                </label>
                                <button
                                    onClick={() => setShowLoRASearch(!showLoRASearch)}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add LoRA
                                </button>
                            </div>

                            {/* Selected LoRAs */}
                            {selectedLoRAs.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto">
                                    {selectedLoRAs.map(lora => (
                                        <div
                                            key={lora.id}
                                            className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg shrink-0"
                                        >
                                            <div className="flex flex-col max-w-[150px]">
                                                <span className="text-xs text-white font-medium truncate">{lora.name}</span>
                                                <span className="text-[10px] text-purple-300 truncate">
                                                    {lora.triggerWords?.[0] || ''}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => removeLoRA(lora.id)}
                                                className="p-0.5 text-gray-400 hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-gray-500 mb-2">
                                    No LoRAs selected. Trigger words will be automatically placed.
                                </p>
                            )}

                            {/* Trigger Words Preview */}
                            {triggerWordsPreview.length > 0 && (
                                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    <span>Will prepend:</span>
                                    <code className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded truncate max-w-xs">
                                        {triggerWordsPreview.slice(0, 5).join(', ')}
                                        {triggerWordsPreview.length > 5 && ` +${triggerWordsPreview.length - 5} more`}
                                    </code>
                                </div>
                            )}

                            {/* LoRA Search */}
                            {showLoRASearch && (
                                <div className="mt-2 p-2 bg-white/5 rounded-lg">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={loraSearchQuery}
                                            onChange={(e) => setLoraSearchQuery(e.target.value)}
                                            placeholder="Search LoRAs by name or trigger word..."
                                            className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500"
                                        />
                                    </div>

                                    {isSearchingLoRAs ? (
                                        <div className="flex items-center justify-center py-4">
                                            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                                        </div>
                                    ) : loraSearchResults.length > 0 ? (
                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                            {loraSearchResults.map(lora => (
                                                <button
                                                    key={lora.id}
                                                    onClick={() => addLoRA(lora)}
                                                    className="w-full flex items-center gap-2 p-2 bg-white/5 hover:bg-white/10 rounded text-left transition-colors"
                                                >
                                                    {lora.thumbnailUrl && (
                                                        <img
                                                            src={lora.thumbnailUrl}
                                                            alt=""
                                                            className="w-8 h-8 rounded object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-white truncate">{lora.name}</div>
                                                        <div className="text-[10px] text-gray-400 truncate">
                                                            {lora.triggerWords.join(', ')}
                                                        </div>
                                                    </div>
                                                    <span className={clsx(
                                                        "text-[10px] px-1.5 py-0.5 rounded",
                                                        lora.type === 'character' ? "bg-blue-500/20 text-blue-400" :
                                                            lora.type === 'style' ? "bg-pink-500/20 text-pink-400" :
                                                                "bg-gray-500/20 text-gray-400"
                                                    )}>
                                                        {lora.type}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : loraSearchQuery && (
                                        <p className="text-[10px] text-gray-500 text-center py-2">No LoRAs found</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Character Elements Section */}
                        {
                            characterElements.length > 0 && (
                                <div className="p-3 border-b border-white/10">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        Character Reference (for consistency)
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {characterElements.map(element => (
                                            <button
                                                key={element.id}
                                                onClick={() => {
                                                    toggleElement(element.id);
                                                    if (!selectedElements.includes(element.id)) {
                                                        setPrimaryCharacterId(element.id);
                                                    }
                                                }}
                                                className={clsx(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all",
                                                    selectedElements.includes(element.id)
                                                        ? "bg-blue-500/20 border-blue-500 text-white"
                                                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                                                )}
                                            >
                                                {element.imageUrl && (
                                                    <img
                                                        src={element.imageUrl}
                                                        alt=""
                                                        className="w-6 h-6 rounded object-cover"
                                                    />
                                                )}
                                                <span className="text-xs">{element.name}</span>
                                                {primaryCharacterId === element.id && (
                                                    <span className="text-[9px] px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                                        PRIMARY
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )
                        }

                        {/* Style & Camera (Video) */}
                        {
                            generationType === 'video' && (
                                <div className="p-3 border-b border-white/10 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                            Camera Movement
                                        </label>
                                        <select
                                            value={cameraMovement}
                                            onChange={(e) => setCameraMovement(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                                        >
                                            <option value="">None</option>
                                            <option value="Push in">Push in</option>
                                            <option value="Pull back">Pull back</option>
                                            <option value="Pan left">Pan left</option>
                                            <option value="Pan right">Pan right</option>
                                            <option value="Tilt up">Tilt up</option>
                                            <option value="Tilt down">Tilt down</option>
                                            <option value="Tracking shot">Tracking shot</option>
                                            <option value="Dolly zoom">Dolly zoom</option>
                                            <option value="Orbit">Orbit around subject</option>
                                            <option value="Crane up">Crane up</option>
                                            <option value="Handheld">Handheld shake</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                            Camera Angle
                                        </label>
                                        <select
                                            value={cameraAngle}
                                            onChange={(e) => setCameraAngle(e.target.value)}
                                            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white"
                                        >
                                            <option value="">Default</option>
                                            <option value="low angle">Low angle</option>
                                            <option value="high angle">High angle</option>
                                            <option value="eye level">Eye level</option>
                                            <option value="bird's eye">Bird's eye</option>
                                            <option value="worm's eye">Worm's eye</option>
                                            <option value="dutch angle">Dutch angle</option>
                                            <option value="over the shoulder">Over the shoulder</option>
                                        </select>
                                    </div>
                                </div>
                            )
                        }

                        {/* Prompt Input */}
                        <div className="p-3">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    Your Prompt
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "text-[10px]",
                                        isOverLimit ? "text-red-400" : "text-gray-500"
                                    )}>
                                        {promptLength}{modelGuide?.maxLength ? `/ ${modelGuide.maxLength} ` : ''} chars
                                    </span>
                                    {modelGuide && (
                                        <span className="text-[10px] text-gray-500">
                                            ({modelGuide.syntaxStyle} syntax)
                                        </span>
                                    )}
                                </div>
                            </div>

                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onPaste={handlePaste}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe what you want to generate (or paste an image for analysis)..."
                                rows={4}
                                className={clsx(
                                    "w-full px-3 py-2 bg-white/5 border rounded-lg text-sm text-white placeholder-gray-500 resize-none font-mono",
                                    isOverLimit ? "border-red-500" : "border-white/10 focus:border-purple-500"
                                )}
                            />

                            {/* Smart Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="absolute z-10 bottom-full mb-2 left-0 w-full px-3">
                                    <div className="bg-[#1a1a1a] border border-purple-500/30 rounded-lg shadow-xl p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1">
                                            <Sparkles className="w-3 h-3" />
                                            <span>Smart Suggestions</span>
                                        </div>
                                        {suggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => applySuggestion(s)}
                                                className="w-full flex items-center justify-between p-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-left transition-colors border border-purple-500/20 group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-300">
                                                        Replace <span className="text-white font-medium">"{s.trigger}"</span> with
                                                    </span>
                                                    <code className="px-1.5 py-0.5 bg-black/50 rounded text-xs text-purple-300 font-mono">
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

                            {/* Image Upload Zone */}
                            <div className="mt-2">
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {images.map((img, idx) => (
                                        <div key={idx} className="relative inline-block group">
                                            <img
                                                src={img}
                                                alt={`Reference ${idx + 1} `}
                                                className="h-20 w-auto rounded-lg border border-white/20"
                                            />
                                            <button
                                                onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[9px] text-white text-center py-0.5 rounded-b-lg">
                                                {idx === 0 ? 'Main Ref' : `Ref ${idx + 1} `}
                                            </div>
                                        </div>
                                    ))}

                                    {images.length < 3 && (
                                        <div
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={handleDrop}
                                            className={clsx(
                                                "flex items-center justify-center p-4 rounded-lg border border-dashed transition-all cursor-pointer h-20 w-32",
                                                isDragging
                                                    ? "border-purple-500 bg-purple-500/10"
                                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                            )}
                                            onClick={() => document.getElementById('vision-upload')?.click()}
                                        >
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="w-4 h-4 text-gray-400 mb-1" />
                                                <span className="text-[10px] text-gray-500 text-center">
                                                    {images.length === 0 ? "Drop Image" : "+ Add Ref"}
                                                </span>
                                            </div>
                                            <input
                                                id="vision-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Model-specific hints */}
                            {modelGuide && (
                                <div className="mt-2 flex items-start gap-2 text-[10px] text-gray-500">
                                    <Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <span>
                                        {modelGuide.syntaxStyle === 'weighted' && "Tip: Use (term:1.2) to emphasize important features"}
                                        {modelGuide.syntaxStyle === 'tags' && "Tip: Use comma-separated tags like danbooru style"}
                                        {modelGuide.syntaxStyle === 'natural' && "Tip: Write detailed natural language descriptions"}
                                        {modelGuide.syntaxStyle === 'structured' && "Tip: Use [camera commands] in brackets for video"}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Negative Prompt Section */}
                        {
                            addNegativePrompt && (
                                <div className="p-3 border-t border-white/10">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Negative Prompt
                                        </label>
                                        <button
                                            onClick={() => setShowNegativePromptLibrary(true)}
                                            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                                        >
                                            <Library className="w-3 h-3" />
                                            Library
                                        </button>
                                    </div>
                                    <textarea
                                        value={customNegativePrompt}
                                        onChange={(e) => setCustomNegativePrompt(e.target.value)}
                                        placeholder="Describe what you DON'T want (e.g. blurry, text, bad anatomy)..."
                                        rows={2}
                                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 resize-none focus:border-red-500/50 focus:outline-none"
                                    />
                                </div>
                            )
                        }



                        {/* Enhanced Result */}
                        {
                            enhancedPrompt && showEnhanced && (
                                <div className="border-t border-white/10">
                                    <div className="p-3 bg-gradient-to-b from-purple-500/10 to-transparent">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-purple-400" />
                                                <span className="text-sm font-bold text-white">Enhanced Prompt</span>
                                                <span className={clsx(
                                                    "text-[10px] px-2 py-0.5 rounded",
                                                    enhancedPrompt.analysis.characterConsistencyScore >= 80
                                                        ? "bg-green-500/20 text-green-400"
                                                        : enhancedPrompt.analysis.characterConsistencyScore >= 60
                                                            ? "bg-yellow-500/20 text-yellow-400"
                                                            : "bg-red-500/20 text-red-400"
                                                )}>
                                                    Consistency: {enhancedPrompt.analysis.characterConsistencyScore}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => copyToClipboard(enhancedPrompt.prompt)}
                                                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                                    title="Copy to clipboard"
                                                >
                                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => setShowEnhanced(false)}
                                                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <EyeOff className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Enhanced prompt display */}
                                        <div className="p-3 bg-white/5 rounded-lg text-sm text-gray-200 whitespace-pre-wrap">
                                            {enhancedPrompt.prompt}
                                        </div>

                                        {/* Negative prompt */}
                                        {enhancedPrompt.negativePrompt && (
                                            <div className="mt-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                    Negative Prompt
                                                </label>
                                                <div className="p-2 bg-red-500/10 rounded-lg text-xs text-red-300 whitespace-pre-wrap">
                                                    {enhancedPrompt.negativePrompt}
                                                </div>
                                            </div>
                                        )}

                                        {/* Components breakdown */}
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {enhancedPrompt.components.triggerWords.length > 0 && (
                                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                                    <span className="text-[10px] font-bold text-yellow-400">Trigger Words</span>
                                                    <div className="text-[10px] text-yellow-300 mt-1">
                                                        {enhancedPrompt.components.triggerWords.join(', ')}
                                                    </div>
                                                </div>
                                            )}
                                            {enhancedPrompt.components.qualityBoosters.length > 0 && (
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <span className="text-[10px] font-bold text-blue-400">Quality Terms</span>
                                                    <div className="text-[10px] text-blue-300 mt-1">
                                                        {enhancedPrompt.components.qualityBoosters.join(', ')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recommendations */}
                                        {(enhancedPrompt.recommendations.cfgScale || enhancedPrompt.recommendations.steps) && (
                                            <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400">
                                                <Sliders className="w-3 h-3" />
                                                <span>Recommended:</span>
                                                {enhancedPrompt.recommendations.cfgScale && (
                                                    <span className="px-1.5 py-0.5 bg-white/10 rounded">
                                                        CFG: {enhancedPrompt.recommendations.cfgScale}
                                                    </span>
                                                )}
                                                {enhancedPrompt.recommendations.steps && (
                                                    <span className="px-1.5 py-0.5 bg-white/10 rounded">
                                                        Steps: {enhancedPrompt.recommendations.steps}
                                                    </span>
                                                )}
                                                {enhancedPrompt.recommendations.sampler && (
                                                    <span className="px-1.5 py-0.5 bg-white/10 rounded">
                                                        {enhancedPrompt.recommendations.sampler}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Recommended LoRAs */}
                                        {enhancedPrompt.recommendations.loras && enhancedPrompt.recommendations.loras.length > 0 && (
                                            <div className="mt-3">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                                                    Recommended LoRAs
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {enhancedPrompt.recommendations.loras.map((lora, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={`https://civitai.com/search/models?query=${encodeURIComponent(lora)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition-colors flex items-center gap-1"
                                                        >
                                                            {lora}
                                                            < ExternalLink className="w-2 h-2 opacity-50" />
                                                        </a >
                                                    ))}
                                                </div >
                                            </div >
                                        )}

                                        {/* LoRA Strength Recommendations */}
                                        {selectedLoRAs.length > 0 && (
                                            <div className="mt-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                                    <Sliders className="w-3 h-3" />
                                                    Strength Adjustments
                                                </span>
                                                <div className="space-y-1">
                                                    {selectedLoRAs.map(lora => {
                                                        const recommendedStrength = enhancedPrompt.recommendations.loraStrengths?.[lora.name]
                                                            ?? enhancedPrompt.recommendations.loraStrengths?.[lora.id];
                                                        const hasChange = recommendedStrength !== undefined && recommendedStrength !== lora.recommendedStrength;

                                                        return (
                                                            <div key={lora.id} className="flex items-center justify-between text-[10px]">
                                                                <span className="text-gray-300">{lora.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {hasChange ? (
                                                                        <>
                                                                            <span className="text-gray-500 line-through">
                                                                                {lora.recommendedStrength?.toFixed(2) || '1.00'}
                                                                            </span>
                                                                            <span className="text-blue-300 font-mono font-bold">
                                                                                {recommendedStrength?.toFixed(2)}
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-gray-500 font-mono">
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
                                        {
                                            (enhancedPrompt.recommendations.scheduler || enhancedPrompt.recommendations.sampler) && (
                                                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-400">
                                                    {enhancedPrompt.recommendations.scheduler && (
                                                        <span className="px-1.5 py-0.5 bg-white/10 rounded flex items-center gap-1">
                                                            <Layers className="w-3 h-3" />
                                                            Scheduler: {enhancedPrompt.recommendations.scheduler}
                                                        </span>
                                                    )}
                                                    {enhancedPrompt.recommendations.sampler && (
                                                        <span className="px-1.5 py-0.5 bg-white/10 rounded flex items-center gap-1">
                                                            <Zap className="w-3 h-3" />
                                                            Sampler: {enhancedPrompt.recommendations.sampler}
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        }

                                        {/* Use enhanced prompt button */}
                                        <button
                                            onClick={useEnhancedPrompt}
                                            className="mt-3 w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-sm text-purple-400 font-medium transition-colors"
                                        >
                                            Use Enhanced Prompt
                                        </button>
                                    </div >
                                </div >
                            )
                        }
                        {/* Footer Actions */}
                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/10 bg-[#1a1a1a]">
                            {enhancedPrompt && showEnhanced ? (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowEnhanced(false);
                                            setEnhancedPrompt(null);
                                        }}
                                        className="px-4 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={useEnhancedPrompt}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Use Enhanced Prompt
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={enhance}
                                    disabled={isEnhancing || !prompt.trim()}
                                    className={clsx(
                                        "w-full py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                                        prompt.trim()
                                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 shadow-pink-500/20"
                                            : "bg-white/5 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    {isEnhancing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Enhancing Prompt...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            Enhance Prompt for {modelGuide?.name || 'Model'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )
            }
            {/* Negative Prompt Manager Modal */}
            <NegativePromptManager
                projectId="default" // You might want to pass a real projectId here if available in context
                isOpen={showNegativePromptLibrary}
                onClose={() => setShowNegativePromptLibrary(false)}
                currentPrompt={customNegativePrompt}
                onSelect={(prompt) => setCustomNegativePrompt(prompt)}
                onAppend={(prompt) => {
                    const separator = customNegativePrompt.trim() ? ', ' : '';
                    setCustomNegativePrompt((customNegativePrompt || '') + separator + prompt);
                }}
            />
        </div >
    );
}

export default PromptBuilder;

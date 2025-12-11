"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    Sparkles, Settings, Wand2, Eye, EyeOff, Copy, Check,
    ChevronDown, ChevronUp, AlertCircle, Info, Zap, User,
    Palette, Camera, Layers, RefreshCw, Search, Plus, X,
    Lightbulb, Target, Sliders, Heart, Image as ImageIcon
} from "lucide-react";
import { clsx } from "clsx";
import { fetchAPI } from "@/lib/api";
import { useDebouncedCallback } from "use-debounce";

// ==================== FAVORITE REFERENCE TYPES ====================

interface FavoritedGeneration {
    id: string;
    prompt: string;
    imageUrl: string;
    thumbnailUrl: string;
    aspectRatio?: string;
    createdAt: string;
}

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
    };
    analysis: {
        modelUsed: string;
        syntaxStyle: string;
        characterConsistencyScore: number;
        promptComplexity: number;
    };
}

interface PromptBuilderProps {
    initialPrompt?: string;
    modelId: string;
    generationType: 'image' | 'video';
    elements?: ElementItem[];
    initialLoRAs?: LoRAItem[];
    projectId?: string; // For fetching favorites
    onPromptChange: (prompt: string, negativePrompt?: string) => void;
    onRecommendationsChange?: (recommendations: EnhancedResult['recommendations']) => void;
    onAddReference?: (imageUrl: string) => void; // Callback to add image as reference
    onClose?: () => void;
}

// ==================== MAIN COMPONENT ====================

export function PromptBuilder({
    initialPrompt = "",
    modelId,
    generationType,
    elements = [],
    initialLoRAs = [],
    projectId,
    onPromptChange,
    onRecommendationsChange,
    onAddReference,
    onClose
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

    // Favorite References
    const [showFavoritesSuggestion, setShowFavoritesSuggestion] = useState(false);
    const [suggestedFavorites, setSuggestedFavorites] = useState<FavoritedGeneration[]>([]);
    const [detectedCharacter, setDetectedCharacter] = useState<string | null>(null);
    const [isFetchingFavorites, setIsFetchingFavorites] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    // Detect character names in prompt and fetch favorites
    const checkForCharacterMentions = useCallback(async (promptText: string) => {
        if (!projectId || !promptText) {
            setShowFavoritesSuggestion(false);
            return;
        }

        // Look for @mentions in the prompt
        const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
        const mentions = [...promptText.matchAll(mentionRegex)].map(match => match[1]);

        // Also check for character element names (without @ prefix)
        const characterElements = elements.filter(e => e.type === 'character');
        const characterMatches = characterElements.filter(el =>
            promptText.toLowerCase().includes(el.name.toLowerCase())
        );

        const detectedNames = [...new Set([...mentions, ...characterMatches.map(c => c.name)])];

        if (detectedNames.length > 0) {
            const firstMatch = detectedNames[0];
            setDetectedCharacter(firstMatch);

            // Fetch favorited generations for this character
            setIsFetchingFavorites(true);
            try {
                const favorites = await fetchAPI(
                    `/projects/${projectId}/generations/favorites?character=${encodeURIComponent(firstMatch)}&limit=6`
                );
                if (favorites && favorites.length > 0) {
                    setSuggestedFavorites(favorites);
                    setShowFavoritesSuggestion(true);
                } else {
                    // Try fetching all favorites if no character-specific ones
                    const allFavorites = await fetchAPI(
                        `/projects/${projectId}/generations/favorites?limit=6`
                    );
                    if (allFavorites && allFavorites.length > 0) {
                        setSuggestedFavorites(allFavorites);
                        setShowFavoritesSuggestion(true);
                    } else {
                        setShowFavoritesSuggestion(false);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch favorites:', error);
                setShowFavoritesSuggestion(false);
            } finally {
                setIsFetchingFavorites(false);
            }
        } else {
            setShowFavoritesSuggestion(false);
            setDetectedCharacter(null);
        }
    }, [projectId, elements]);

    const debouncedCheckCharacters = useDebouncedCallback(checkForCharacterMentions, 500);

    // Trigger character detection when prompt changes
    useEffect(() => {
        debouncedCheckCharacters(prompt);
    }, [prompt, debouncedCheckCharacters]);

    // Handler for using a favorite as reference
    const handleUseFavoriteAsReference = useCallback((favorite: FavoritedGeneration) => {
        if (onAddReference) {
            // Ensure the URL is properly formatted
            const imageUrl = favorite.imageUrl.startsWith('http')
                ? favorite.imageUrl
                : `http://localhost:3001${favorite.imageUrl}`;
            onAddReference(imageUrl);
        }
        setShowFavoritesSuggestion(false);
    }, [onAddReference]);

    // ==================== HANDLERS ====================

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
                    loras: selectedLoRAs, // Send full LoRA objects with triggerWords
                    style,
                    mood,
                    cameraMovement: generationType === 'video' ? cameraMovement : undefined,
                    cameraAngle: generationType === 'video' ? cameraAngle : undefined,
                    enhancementLevel,
                    preserveOriginalIntent: true,
                    addQualityBoosters,
                    addNegativePrompt,
                    consistencyPriority
                })
            });

            setEnhancedPrompt(result);
            setShowEnhanced(true);

            // Update parent with enhanced prompt
            onPromptChange(result.prompt, result.negativePrompt);
            onRecommendationsChange?.(result.recommendations);

        } catch (error) {
            console.error('Enhancement failed:', error);
        } finally {
            setIsEnhancing(false);
        }
    }, [
        prompt, modelId, generationType, elements, selectedElements,
        primaryCharacterId, selectedLoRAs, style, mood, cameraMovement,
        cameraAngle, enhancementLevel, addQualityBoosters, addNegativePrompt,
        consistencyPriority, onPromptChange, onRecommendationsChange
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
                    <div className="flex flex-wrap gap-2 mb-2">
                        {selectedLoRAs.map(lora => (
                            <div
                                key={lora.id}
                                className="flex items-center gap-2 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg"
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs text-white font-medium">{lora.name}</span>
                                    <span className="text-[10px] text-purple-300">
                                        {lora.triggerWords.slice(0, 2).join(', ')}
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
                        <code className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                            {triggerWordsPreview.join(', ')}
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
            {characterElements.length > 0 && (
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
            )}

            {/* Style & Camera (Video) */}
            {generationType === 'video' && (
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
            )}

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
                            {promptLength}{modelGuide?.maxLength ? `/${modelGuide.maxLength}` : ''} chars
                        </span>
                        {modelGuide && (
                            <span className="text-[10px] text-gray-500">
                                ({modelGuide.syntaxStyle} syntax)
                            </span>
                        )}
                    </div>
                </div>

                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to generate... (Use @ to reference characters)"
                    rows={4}
                    className={clsx(
                        "w-full px-3 py-2 bg-white/5 border rounded-lg text-sm text-white placeholder-gray-500 resize-none",
                        isOverLimit ? "border-red-500" : "border-white/10 focus:border-purple-500"
                    )}
                />

                {/* Favorite References Suggestion */}
                {showFavoritesSuggestion && suggestedFavorites.length > 0 && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Heart className="w-3.5 h-3.5 text-pink-400" />
                                <span className="text-xs font-medium text-pink-300">
                                    {detectedCharacter
                                        ? `Use a favorite with "${detectedCharacter}" as reference?`
                                        : 'Use a favorited image as reference?'}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowFavoritesSuggestion(false)}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {isFetchingFavorites ? (
                                <div className="flex items-center justify-center w-full py-4">
                                    <RefreshCw className="w-4 h-4 text-pink-400 animate-spin" />
                                </div>
                            ) : (
                                suggestedFavorites.map((fav) => (
                                    <button
                                        key={fav.id}
                                        onClick={() => handleUseFavoriteAsReference(fav)}
                                        className="relative flex-shrink-0 group"
                                        title={fav.prompt}
                                    >
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-pink-500 transition-all">
                                            <img
                                                src={fav.thumbnailUrl.startsWith('http') ? fav.thumbnailUrl : `http://localhost:3001${fav.thumbnailUrl}`}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                            <ImageIcon className="w-4 h-4 text-white" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5">
                            Click an image to use it as a reference for character consistency (IP-Adapter)
                        </p>
                    </div>
                )}

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

            {/* Enhance Button */}
            <div className="p-3 border-t border-white/10 bg-white/5">
                <button
                    onClick={enhance}
                    disabled={!prompt?.trim() || isEnhancing}
                    className={clsx(
                        "w-full flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all",
                        prompt?.trim() && !isEnhancing
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                            : "bg-white/10 text-gray-500 cursor-not-allowed"
                    )}
                >
                    {isEnhancing ? (
                        <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Enhancing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            Enhance Prompt for {modelGuide?.name || modelId}
                        </>
                    )}
                </button>
            </div>

            {/* Enhanced Result */}
            {enhancedPrompt && showEnhanced && (
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
                                        <div key={idx} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded text-[10px] text-purple-300">
                                            {lora}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Additional Settings Recommendations */}
                        {(enhancedPrompt.recommendations.scheduler || enhancedPrompt.recommendations.sampler) && (
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
                        )}

                        {/* Use enhanced prompt button */}
                        <button
                            onClick={useEnhancedPrompt}
                            className="mt-3 w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg text-sm text-purple-400 font-medium transition-colors"
                        >
                            Use Enhanced Prompt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PromptBuilder;

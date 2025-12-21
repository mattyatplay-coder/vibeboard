import { useState, useRef, useEffect } from "react";
import {
    ImageIcon, SlidersHorizontal, Users, Wand2, X, Sparkles, Loader2
} from 'lucide-react';
import { ALL_MODELS } from '@/lib/ModelRegistry';
import { clsx } from "clsx";
import { EngineSelectorV2 } from '@/components/generations/EngineSelectorV2';
import { PromptBuilder } from '@/components/prompts/PromptBuilder';
import { usePromptWeighting } from "@/hooks/usePromptWeighting";
import { Element } from "@/lib/store";
import { StyleConfig } from "@/components/storyboard/StyleSelectorModal";
import { PipelineStage } from "@/hooks/useGeneration";

interface GenerationFormProps {
    prompt: string;
    setPrompt: (p: string) => void;
    isGenerating: boolean;
    onGenerate: () => void;

    // Config
    engineConfig: { provider: string, model: string };
    setEngineConfig: (c: { provider: string, model: string }) => void;
    mode: 'image' | 'video';
    setMode: (m: 'image' | 'video') => void;
    aspectRatio: string;
    duration: string;
    setDuration: (d: string) => void;
    variations: number;
    setVariations: (n: number) => void;

    // Style / Elements
    elements: Element[];
    selectedElementIds: string[];
    toggleElement: (el: Element) => void;
    onOpenStyleModal: () => void;
    isElementPickerOpen: boolean;
    setIsElementPickerOpen: (v: boolean) => void;
    onOpenAdvancedSettings: () => void;

    // Audio
    audioFile: File | null;
    onOpenAudioModal: () => void;

    // Pipeline
    pipelineStages: PipelineStage[];
    setPipelineStages: (v: React.SetStateAction<PipelineStage[]>) => void;

    // Helpers
    styleConfig: StyleConfig | null;
    projectId: string; // needed for reference picker scoping
    onOpenEngineLibrary: () => void;
}

export function GenerationForm({
    prompt, setPrompt, isGenerating, onGenerate,
    engineConfig, setEngineConfig,
    mode, setMode,
    aspectRatio,
    duration, setDuration,
    variations, setVariations,
    elements, selectedElementIds, toggleElement,
    onOpenStyleModal, isElementPickerOpen, setIsElementPickerOpen,
    onOpenAdvancedSettings,
    audioFile, onOpenAudioModal,
    pipelineStages, setPipelineStages,
    styleConfig, projectId,
    onOpenEngineLibrary
}: GenerationFormProps) {
    const [isFocused, setIsFocused] = useState(false);
    const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);

    // Auto-complete (Simplified for extraction, can be fully restored if crucial)
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { handleKeyDown: handleWeightingKeyDown } = usePromptWeighting({
        value: prompt,
        onChange: setPrompt
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        handleWeightingKeyDown(e);
        if (e.defaultPrevented) return;

        if (e.key === 'Enter' && !e.shiftKey && !showSuggestions) {
            e.preventDefault();
            onGenerate();
        }
    };

    // Shortcut: Global Cmd+E to toggle Element Picker
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                setIsElementPickerOpen(!isElementPickerOpen);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isElementPickerOpen, setIsElementPickerOpen]);

    // Duration logic
    const selectedModelInfo = ALL_MODELS.find(m => m.id === engineConfig.model);
    // Use supported durations if available, otherwise default to ['5s', '10s'] for video
    const availableDurations = selectedModelInfo?.supportedDurations || ['5s', '10s'];

    // Reset duration if current selection is not supported by new model
    useEffect(() => {
        if (mode === 'video' && !availableDurations.includes(duration)) {
            // Default to the first supported duration if current is invalid
            setDuration(availableDurations[0]);
        }
    }, [engineConfig.model, mode, availableDurations, duration, setDuration]);

    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const lastChar = val.slice(-1);

        setPrompt(val);

        // Auto-open picker on '@' trigger
        if (lastChar === '@') {
            setIsElementPickerOpen(true);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 p-6 z-50 pointer-events-none flex justify-center">
            <div className="w-full max-w-7xl pointer-events-auto">
                <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/50 flex flex-col gap-2 ring-1 ring-white/5">
                    {/* Elements Drawer */}
                    {isElementPickerOpen && (
                        <div className="px-2 pt-2 pb-1 border-b border-white/5 animate-in slide-in-from-bottom-2 duration-200">
                            {/* ... (Keep existing Logic, simplified here for brevity) ... */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Reference Elements</span>
                            </div>
                            {/* Simplified Element List */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {elements.filter(el => el.projectId === projectId).map(el => (
                                    <button
                                        key={el.id}
                                        onClick={() => toggleElement(el)}
                                        className={clsx(
                                            "relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                                            selectedElementIds.includes(el.id) ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <img src={el.url} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-end">
                        <div className="relative flex-1 min-w-0 bg-black/40 border border-white/5 rounded-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                            <textarea
                                ref={textareaRef}
                                value={prompt}
                                onChange={handlePromptChange}
                                onKeyDown={handleKeyDown}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Describe your shot... (Use @ to reference elements)"
                                className={clsx(
                                    "w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 resize-none py-3 px-4 transition-all duration-200 ease-in-out rounded-xl",
                                    isFocused ? "h-32" : "h-10"
                                )}
                                rows={1}
                            />
                            {/* Selected Elements Chips */}
                            {selectedElementIds.length > 0 && (
                                <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-none">
                                    {elements.filter(e => selectedElementIds.includes(e.id)).map((el) => (
                                        <div key={el.id} className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-[10px] border border-blue-500/30">
                                            <span>@{el.name}</span>
                                            <button onClick={() => toggleElement(el)} className="hover:text-white">X</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 h-10 relative">
                            {/* 1. Smart Prompt (Wand) */}
                            <button
                                onClick={() => setIsPromptBuilderOpen(true)}
                                className="h-10 w-10 flex items-center justify-center bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl text-purple-400 transition-all hover:scale-105"
                                title="Smart Prompt Builder"
                            >
                                <Wand2 className="w-5 h-5" />
                            </button>

                            {/* 2. Style & Aspect Ratio */}
                            <button
                                onClick={onOpenStyleModal}
                                className="h-10 flex items-center gap-2 px-3 rounded-xl border bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="text-sm font-medium hidden sm:inline">Style</span>
                                <div className="h-4 w-px bg-white/10 mx-1" />
                                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-gray-300 font-mono">{aspectRatio}</span>
                            </button>

                            {/* 3. Reference Elements (Users) -> Advanced Modal */}
                            <button
                                onClick={onOpenAdvancedSettings}
                                className={clsx(
                                    "h-10 w-10 flex items-center justify-center rounded-xl transition-all relative border",
                                    isElementPickerOpen
                                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white"
                                )}
                                title="Element References (Advanced)"
                            >
                                <Users className="w-5 h-5" />
                                {selectedElementIds.length > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                                        {selectedElementIds.length}
                                    </span>
                                )}
                            </button>

                            {/* 4. Duration Selector (Video Only) */}
                            {mode === 'video' && (
                                <div className="relative">
                                    <select
                                        className="h-10 pl-3 pr-8 bg-black/20 border border-white/5 rounded-xl text-sm font-medium hover:bg-white/5 transition-all text-white appearance-none outline-none focus:ring-1 focus:ring-blue-500/50"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                    >
                                        {/* Get supported durations for the current model, default to 5s/10s if not found */}
                                        {availableDurations.map((dur) => (
                                            <option key={dur} value={dur} className="bg-neutral-900 text-white border-0">
                                                {dur}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M6 9l6 6 6-6" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                            {/* Divider */}
                            <div className="h-6 w-px bg-white/10 mx-0.5" />

                            {/* 5. Quantity Selector */}
                            <div className="relative group">
                                {/* ... existing quantity selector ... */}
                                <div className="h-10 flex items-center gap-2 px-3 rounded-xl border bg-black/20 border-white/5 text-gray-400 cursor-pointer hover:bg-white/5 hover:text-white transition-all">
                                    <span className="text-xs font-medium text-gray-500 uppercase">Qty</span>
                                    <span className="text-sm font-bold text-white min-w-[1ch] text-center">{variations}</span>

                                    {/* Dropdown on hover */}
                                    <div className="absolute bottom-full left-0 mb-2 w-full min-w-[60px] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                                        {/* Dynamic Duration Selector */}
                                        {mode === 'video' && (
                                            <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                                {availableDurations.map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDuration(d)}
                                                        className={clsx(
                                                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                                            duration === d
                                                                ? "bg-white/10 text-white shadow-sm"
                                                                : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                                        )}
                                                    >
                                                        {d}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 6. Model Selector Pill */}
                            <div className="w-40">
                                <EngineSelectorV2
                                    selectedProvider={engineConfig.provider}
                                    selectedModel={engineConfig.model}
                                    onSelect={(p, m) => {
                                        setEngineConfig({ provider: p, model: m });
                                        // Auto-switch mode based on model type
                                        const modelInfo = ALL_MODELS.find(x => x.id === m);
                                        if (modelInfo) {
                                            setMode(modelInfo.type);
                                            // Reset duration if current is not supported
                                            const supported = modelInfo.supportedDurations || ['5s', '10s'];
                                            if (!supported.includes(duration)) {
                                                setDuration(supported[0]);
                                            }
                                        }
                                    }}
                                    mode={mode}
                                    variant="compact"
                                />
                            </div>

                            {/* 7. Generate Button */}
                            <button
                                onClick={onGenerate}
                                disabled={isGenerating || !prompt?.trim()}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:grayscale text-white px-4 rounded-xl font-medium h-10 flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white/20" />}
                                Generate
                            </button>
                        </div>
                    </div>

                    {/* Prompt Builder Modal Integration */}
                    {isPromptBuilderOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl relative">
                                <button onClick={() => setIsPromptBuilderOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10">
                                    <X className="w-5 h-5" />
                                </button>
                                <PromptBuilder
                                    initialPrompt={prompt}
                                    modelId={engineConfig.model}
                                    generationType={mode}
                                    elements={elements.map(e => ({
                                        ...e,
                                        description: e.name, // Fallback
                                        consistencyWeight: 1.0, // Default
                                        type: (['character', 'prop', 'location', 'style'].includes(e.type) ? e.type : 'style') as any
                                    }))}
                                    onPromptChange={(newPrompt) => setPrompt(newPrompt)}
                                    // ... other props
                                    onClose={() => setIsPromptBuilderOpen(false)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

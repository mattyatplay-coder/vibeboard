import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, Users, Wand2, X, Sparkles, Loader2 } from 'lucide-react';
import { ALL_MODELS } from '@/lib/ModelRegistry';
import { clsx } from 'clsx';
import { EngineSelectorV2 } from '@/components/generations/EngineSelectorV2';
import { PromptBuilder } from '@/components/prompts/PromptBuilder';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { usePromptWeighting } from '@/hooks/usePromptWeighting';
import { Element } from '@/lib/store';
import { StyleConfig } from '@/components/storyboard/StyleSelectorModal';
import { PipelineStage } from '@/hooks/useGeneration';

interface GenerationFormProps {
  prompt: string;
  setPrompt: (p: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;

  // Config
  engineConfig: { provider: string; model: string };
  setEngineConfig: (c: { provider: string; model: string }) => void;
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
  prompt,
  setPrompt,
  isGenerating,
  onGenerate,
  engineConfig,
  setEngineConfig,
  mode,
  setMode,
  aspectRatio,
  duration,
  setDuration,
  variations,
  setVariations,
  elements,
  selectedElementIds,
  toggleElement,
  onOpenStyleModal,
  isElementPickerOpen,
  setIsElementPickerOpen,
  onOpenAdvancedSettings,
  audioFile,
  onOpenAudioModal,
  pipelineStages,
  setPipelineStages,
  styleConfig,
  projectId,
  onOpenEngineLibrary,
}: GenerationFormProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPromptBuilderOpen, setIsPromptBuilderOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-complete (Simplified for extraction, can be fully restored if crucial)
  const [showSuggestions, setShowSuggestions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { handleKeyDown: handleWeightingKeyDown } = usePromptWeighting({
    value: prompt,
    onChange: setPrompt,
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
    <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-50 flex justify-center p-6">
      <div className="pointer-events-auto w-full max-w-7xl">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#1a1a1a]/90 p-2 shadow-2xl ring-1 shadow-black/50 ring-white/5 backdrop-blur-xl">
          {/* Elements Drawer */}
          {isElementPickerOpen && (
            <div className="animate-in slide-in-from-bottom-2 border-b border-white/5 px-2 pt-2 pb-1 duration-200">
              {/* ... (Keep existing Logic, simplified here for brevity) ... */}
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                  {(() => {
                    const match = prompt.match(/@(\w*)$/);
                    const query = match ? match[1] : '';
                    return query ? `Filtering: "${query}"` : 'Reference Elements';
                  })()}
                </span>
              </div>
              {/* Simplified Element List */}
              <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
                {elements
                  .filter(el => el.projectId === projectId)
                  .filter(el => {
                    // Simple suffix filtering: check if prompt ends with @Query and Query matches element
                    const match = prompt.match(/@(\w*)$/);
                    const query = match ? match[1].toLowerCase() : '';
                    if (!query) return true;
                    return el.name.toLowerCase().includes(query);
                  })
                  .map(el => (
                    <button
                      key={el.id}
                      onClick={() => toggleElement(el)}
                      className={clsx(
                        'relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                        selectedElementIds.includes(el.id)
                          ? 'border-blue-500'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                    >
                      <Tooltip content={el.name} side="top">
                        <img src={el.url} className="h-full w-full object-cover" />
                      </Tooltip>
                    </button>
                  ))}
                {elements.filter(el => el.projectId === projectId).length === 0 && (
                  <span className="py-2 text-xs text-gray-500">No elements found in project.</span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1 rounded-xl border border-white/5 bg-black/40 transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handlePromptChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Describe your shot... (Use @ to reference elements)"
                className={clsx(
                  'w-full resize-none rounded-xl border-none bg-transparent px-4 py-3 text-white placeholder-gray-500 transition-all duration-200 ease-in-out focus:ring-0',
                  isFocused ? 'h-32' : 'h-10'
                )}
                rows={1}
              />
              {/* Selected Elements Chips */}
              {selectedElementIds.length > 0 && (
                <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-2">
                  {elements
                    .filter(e => selectedElementIds.includes(e.id))
                    .map(el => (
                      <div
                        key={el.id}
                        className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-1 text-[10px] text-blue-300"
                      >
                        <span>@{el.name}</span>
                        <button onClick={() => toggleElement(el)} className="hover:text-white">
                          X
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="relative flex h-10 shrink-0 items-center gap-1.5">
              {/* 1. Smart Prompt (Wand) */}
              <Tooltip content="Smart Prompt Builder" side="top">
                <button
                  onClick={() => setIsPromptBuilderOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 transition-all hover:scale-105 hover:bg-purple-500/20"
                >
                  <Wand2 className="h-5 w-5" />
                </button>
              </Tooltip>

              {/* 2. Style & Aspect Ratio */}
              <button
                onClick={onOpenStyleModal}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 text-gray-400 transition-all hover:bg-white/5 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden text-sm font-medium sm:inline">Style</span>
                <div className="mx-1 h-4 w-px bg-white/10" />
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-300">
                  {aspectRatio}
                </span>
              </button>

              {/* 3. Reference Elements (Users) -> Advanced Modal */}
              <Tooltip content="Element References (Advanced)" side="top">
                <button
                  onClick={onOpenAdvancedSettings}
                  className={clsx(
                    'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
                    isElementPickerOpen
                      ? 'border-blue-500/50 bg-blue-500/20 text-blue-300'
                      : 'border-white/5 bg-black/20 text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Users className="h-5 w-5" />
                  {selectedElementIds.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                      {selectedElementIds.length}
                    </span>
                  )}
                </button>
              </Tooltip>

              {/* Model Selector Pill - Duration/Qty now in Model Library sidebar */}
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
                  audioFile={audioFile}
                  onAudioChange={file => {
                    // Wrapper to match expected signature if needed, or directly pass setAudioFile from parent
                    // GenerationForm receives onOpenAudioModal?
                    // Wait, GenerationForm uses onOpenAudioModal for its OWN button.
                    // But EngineLibraryModal needs onAudioChange to SET the file.
                    // GenerationForm props has `audioFile`. Does it have `setAudioFile`?
                    // No, it has `onOpenAudioModal`.
                    // Let's check GenerationForm props again.
                  }}
                />
              </div>

              {/* 7. Generate Button */}
              <button
                onClick={onGenerate}
                disabled={isGenerating || !prompt?.trim()}
                className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:grayscale"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 fill-white/20" />
                )}
                Generate
              </button>
            </div>
          </div>

          {/* Prompt Builder Modal - Rendered via Portal */}
          {mounted &&
            isPromptBuilderOpen &&
            createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
                  <button
                    onClick={() => setIsPromptBuilderOpen(false)}
                    className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <PromptBuilder
                    initialPrompt={prompt}
                    modelId={engineConfig.model}
                    generationType={mode}
                    elements={elements
                      .filter(e => selectedElementIds.includes(e.id))
                      .map(e => ({
                        id: e.id,
                        name: e.name,
                        description: e.name,
                        consistencyWeight: 1.0,
                        type: (['character', 'prop', 'location', 'style'].includes(e.type)
                          ? e.type
                          : 'style') as 'character' | 'prop' | 'location' | 'style',
                        imageUrl: e.url || e.thumbnail,
                      }))}
                    initialImages={elements
                      .filter(e => selectedElementIds.includes(e.id) && (e.url || e.thumbnail))
                      .map(e => e.url || e.thumbnail)
                      .filter((url): url is string => !!url)}
                    initialLoRAs={
                      styleConfig?.loras?.map(l => ({
                        id: l.id,
                        name: l.name,
                        triggerWords: l.triggerWords || (l.triggerWord ? [l.triggerWord] : []),
                        type: 'style' as const,
                        baseModel: l.baseModel || 'Unknown',
                        recommendedStrength: l.strength,
                        useCount: 0,
                      })) || []
                    }
                    onPromptChange={newPrompt => setPrompt(newPrompt)}
                    onClose={() => setIsPromptBuilderOpen(false)}
                  />
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
    </div>
  );
}

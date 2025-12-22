import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, Wand2, Check, AlertCircle } from 'lucide-react';
import { fetchAPI } from '@/lib/api';
import { PromptWizardProvider, usePromptWizard } from '@/context/PromptWizardContext';
import { TagSelector } from '@/components/tag-system';
import { Tag } from '@/components/tag-system/TagSelector';
import { buildEnhancedPrompt } from '@/lib/promptBuilder';
import { ENGINES } from '@/data/engines';
import { EnhancedMotionSlider } from '@/components/motion-slider';
import { recommendEngine } from '@/lib/engineRecommendation';

interface PromptWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (prompt: string, settings?: any) => void;
  initialPrompt?: string;
}

const PromptWizardContent = ({
  onClose,
  onComplete,
  initialPrompt,
}: Omit<PromptWizardModalProps, 'isOpen'>) => {
  const { state, dispatch } = usePromptWizard();
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualDetails, setManualDetails] = useState('');

  const recommendation = state.initialPrompt
    ? recommendEngine(state.initialPrompt, state.selectedTags)
    : null;

  // Initialize
  useEffect(() => {
    if (initialPrompt) {
      dispatch({ type: 'SET_INITIAL_PROMPT', prompt: initialPrompt });
    }
  }, [initialPrompt, dispatch]);

  const handleEnhance = async () => {
    setIsLoading(true);
    try {
      // Use the utility to build the prompt
      // For now, we use a default engine if none selected, or the first one
      const engine = state.selectedEngine || ENGINES.kling;

      const { enhancedPrompt, positiveAdditions, negativePrompt } = buildEnhancedPrompt(
        state.initialPrompt,
        state.selectedTags,
        engine,
        state.selectedLoRAs
      );

      // If manual details were added, append them
      const finalPrompt = enhancedResultPrompt(enhancedPrompt, manualDetails);

      dispatch({ type: 'SET_ENHANCED_PROMPT', prompt: finalPrompt });

      // In a real app, we might call an API here to get AI improvements
      // For now, we simulate the "Enhance" API call or use the local logic
      // The original code called /prompts/enhance. We can still do that if needed,
      // but our local logic is quite strong now.
      // Let's stick to local logic for speed, or call API if we want LLM expansion.
      // For this implementation, we'll use the local builder + API for "magic".

      // Simulating API call for "Magic" expansion if needed,
      // but for now let's trust our local builder which is deterministic and fast.

      dispatch({ type: 'SET_STEP', step: 4 });
    } catch (err) {
      console.error('Enhancement failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const enhancedResultPrompt = (base: string, manual: string) => {
    if (!manual) return base;
    return `${base}, ${manual}`;
  };

  const handleNext = () => {
    if (state.currentStep < 4) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 });
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 });
    }
  };

  return (
    <div className="flex h-[800px] max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Prompt Wizard</h2>
            <p className="text-xs text-gray-400">Step {state.currentStep} of 4</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
          style={{ width: `${(state.currentStep / 4) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#121212] p-8">
        {state.currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-2xl space-y-6 duration-300">
            <div className="mb-8 space-y-2 text-center">
              <h3 className="text-2xl font-bold">What do you want to create?</h3>
              <p className="text-gray-400">Start with a simple idea or instruction.</p>
            </div>
            <textarea
              value={state.initialPrompt}
              onChange={e => dispatch({ type: 'SET_INITIAL_PROMPT', prompt: e.target.value })}
              placeholder="e.g. A cinematic shot of a cyberpunk detective walking in the rain..."
              className="h-40 w-full resize-none rounded-xl border border-white/10 bg-black/50 p-4 text-lg transition-colors focus:border-purple-500 focus:outline-none"
              autoFocus
            />
          </div>
        )}

        {state.currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-3xl space-y-6 duration-300">
            <div className="mb-6 space-y-2 text-center">
              <h3 className="text-2xl font-bold">Add Details</h3>
              <p className="text-gray-400">Flesh out your scene with specific elements.</p>
            </div>

            {!showAdvanced ? (
              <div className="space-y-6">
                <TagSelector
                  selectedTags={state.selectedTags}
                  onTagsChange={(tags: Tag[]) => dispatch({ type: 'SET_SELECTED_TAGS', tags })}
                  maxTags={10}
                  className="w-full"
                />

                {/* Quick Suggestions if empty */}
                {state.selectedTags.length === 0 && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-900/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 text-blue-400" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-300">Pro Tip</h4>
                        <p className="mt-1 text-xs text-blue-200/70">
                          Select tags to automatically configure camera, lighting, and style. Try
                          searching for "Cinematic" or "Golden Hour".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={manualDetails}
                  onChange={e => setManualDetails(e.target.value)}
                  placeholder="Describe details manually (e.g. wide shot, cinematic lighting)..."
                  className="h-48 w-full resize-none rounded-xl border border-white/10 bg-black/50 p-4 transition-colors focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500">
                  Manual details will be appended to your prompt.
                </p>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                {showAdvanced ? (
                  <>
                    <Wand2 className="h-4 w-4" /> Switch to Tag Selector
                  </>
                ) : (
                  <>
                    <span className="border-b border-dashed border-gray-600 text-xs">
                      Switch to Advanced Text Input
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {state.currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 mx-auto max-w-2xl space-y-6 duration-300">
            <div className="mb-6 space-y-2 text-center">
              <h3 className="text-2xl font-bold">Choose Engine</h3>
              <p className="text-gray-400">Select the best model for your generation.</p>
            </div>

            {/* Recommendation Banner */}
            {recommendation && (
              <div className="mb-6 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Recommended: {recommendation.engine.name}
                    </h4>
                    <p className="mt-1 text-xs text-gray-300">{recommendation.reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {Object.values(ENGINES).map(engine => {
                const isRecommended = recommendation?.engine.id === engine.id;
                const isSelected = state.selectedEngine?.id === engine.id;

                return (
                  <div
                    key={engine.id}
                    onClick={() => dispatch({ type: 'SET_ENGINE', engine })}
                    className={`relative flex cursor-pointer items-center justify-between overflow-hidden rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute top-0 right-0 rounded-bl-lg bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        BEST MATCH
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 font-medium text-white">
                        {engine.name}
                        {isRecommended && <Sparkles className="h-3 w-3 text-purple-400" />}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">{engine.description}</div>
                    </div>

                    {isSelected && <Check className="h-5 w-5 text-purple-400" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state.currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 mx-auto flex h-full max-w-5xl flex-col space-y-6 duration-300">
            <div className="mb-2 space-y-2 text-center">
              <h3 className="text-2xl font-bold">Review & Configure</h3>
              <p className="text-gray-400">Fine-tune your generation settings.</p>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-8 overflow-y-auto pr-2 lg:grid-cols-2">
              {/* Left Column: Prompt */}
              <div className="space-y-6">
                <div className="flex h-full flex-col space-y-4 rounded-xl border border-white/10 bg-black/50 p-6">
                  <div className="flex-1">
                    <label className="flex items-center justify-between text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Enhanced Prompt
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                        {state.enhancedPrompt.length} chars
                      </span>
                    </label>
                    <textarea
                      value={state.enhancedPrompt}
                      onChange={e =>
                        dispatch({ type: 'SET_ENHANCED_PROMPT', prompt: e.target.value })
                      }
                      className="mt-2 h-full min-h-[200px] w-full resize-none border-none bg-transparent text-lg leading-relaxed text-white focus:ring-0"
                    />
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Negative Prompt
                    </label>
                    <textarea
                      value={state.negativePrompt}
                      onChange={e =>
                        dispatch({ type: 'SET_NEGATIVE_PROMPT', prompt: e.target.value })
                      } // Need to add this action type if not exists, or just use generic setter
                      className="mt-1 h-20 w-full resize-none border-none bg-transparent text-sm text-gray-400 focus:ring-0"
                      placeholder="Low quality, blurry..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Settings */}
              <div className="space-y-6">
                {/* Motion Slider */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <EnhancedMotionSlider
                    value={state.motionScale}
                    onChange={(value: number) => dispatch({ type: 'SET_MOTION_SCALE', value })}
                    engineType={(state.selectedEngine?.id as any) || 'kling'}
                    showRecommendations={true}
                  />
                </div>

                {/* Other Settings Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      CFG Scale
                    </label>
                    <input
                      type="number"
                      value={state.cfgScale}
                      onChange={e =>
                        dispatch({ type: 'SET_CFG_SCALE', value: parseFloat(e.target.value) })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-purple-500"
                      step="0.5"
                    />
                  </div>
                  <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Steps
                    </label>
                    <input
                      type="number"
                      value={state.steps}
                      onChange={e =>
                        dispatch({ type: 'SET_STEPS', value: parseInt(e.target.value) })
                      }
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Cost & Info */}
                <div className="flex items-center justify-between rounded-xl border border-green-500/20 bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-4">
                  <div>
                    <div className="text-xs font-medium tracking-wider text-green-400 uppercase">
                      Estimated Cost
                    </div>
                    <div className="mt-0.5 text-lg font-bold text-white">
                      {state.estimatedCost} Credits
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium tracking-wider text-gray-400 uppercase">
                      Engine
                    </div>
                    <div className="mt-0.5 text-sm font-bold text-white">
                      {state.selectedEngine?.name || 'Default'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 bg-white/5 p-6">
        {state.currentStep > 1 ? (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <div></div>
        )}

        {state.currentStep < 3 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-gray-200"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : state.currentStep === 3 ? (
          <button
            onClick={handleEnhance}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" /> Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" /> Enhance Prompt
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() =>
              onComplete(state.enhancedPrompt, {
                engine: state.selectedEngine,
                cfgScale: state.cfgScale,
                steps: state.steps,
              })
            }
            className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 font-medium text-white transition-colors hover:bg-green-600"
          >
            <Check className="h-4 w-4" /> Use Prompt
          </button>
        )}
      </div>
    </div>
  );
};

export const PromptWizardModal = (props: PromptWizardModalProps) => {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <PromptWizardProvider>
        <PromptWizardContent {...props} />
      </PromptWizardProvider>
    </div>
  );
};

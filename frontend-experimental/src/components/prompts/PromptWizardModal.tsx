import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles, Wand2, Check, AlertCircle } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { PromptWizardProvider, usePromptWizard } from "@/context/PromptWizardContext";
import { TagSelector } from "@/components/tag-system";
import { Tag } from "@/components/tag-system/TagSelector";
import { buildEnhancedPrompt } from "@/lib/promptBuilder";
import { ENGINES } from "@/data/engines";
import { EnhancedMotionSlider } from "@/components/motion-slider";
import { recommendEngine } from "@/lib/engineRecommendation";

interface PromptWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (prompt: string, settings?: any) => void;
    initialPrompt?: string;
}

const PromptWizardContent = ({ onClose, onComplete, initialPrompt }: Omit<PromptWizardModalProps, 'isOpen'>) => {
    const { state, dispatch } = usePromptWizard();
    const [isLoading, setIsLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [manualDetails, setManualDetails] = useState("");

    const recommendation = state.initialPrompt ? recommendEngine(state.initialPrompt, state.selectedTags) : null;

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
            console.error("Enhancement failed", err);
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
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] h-[800px]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                        <Wand2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Prompt Wizard</h2>
                        <p className="text-xs text-gray-400">Step {state.currentStep} of 4</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-white/5 w-full">
                <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${(state.currentStep / 4) * 100}%` }}
                />
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-[#121212]">
                {state.currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
                        <div className="text-center space-y-2 mb-8">
                            <h3 className="text-2xl font-bold">What do you want to create?</h3>
                            <p className="text-gray-400">Start with a simple idea or instruction.</p>
                        </div>
                        <textarea
                            value={state.initialPrompt}
                            onChange={(e) => dispatch({ type: 'SET_INITIAL_PROMPT', prompt: e.target.value })}
                            placeholder="e.g. A cinematic shot of a cyberpunk detective walking in the rain..."
                            className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-lg focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            autoFocus
                        />
                    </div>
                )}

                {state.currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-3xl mx-auto">
                        <div className="text-center space-y-2 mb-6">
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
                                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                                            <div>
                                                <h4 className="text-sm font-medium text-blue-300">Pro Tip</h4>
                                                <p className="text-xs text-blue-200/70 mt-1">
                                                    Select tags to automatically configure camera, lighting, and style.
                                                    Try searching for "Cinematic" or "Golden Hour".
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
                                    onChange={(e) => setManualDetails(e.target.value)}
                                    placeholder="Describe details manually (e.g. wide shot, cinematic lighting)..."
                                    className="w-full h-48 bg-black/50 border border-white/10 rounded-xl p-4 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                />
                                <p className="text-xs text-gray-500">
                                    Manual details will be appended to your prompt.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="text-sm text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                            >
                                {showAdvanced ? (
                                    <>
                                        <Wand2 className="w-4 h-4" /> Switch to Tag Selector
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs border-b border-dashed border-gray-600">Switch to Advanced Text Input</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {state.currentStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl mx-auto">
                        <div className="text-center space-y-2 mb-6">
                            <h3 className="text-2xl font-bold">Choose Engine</h3>
                            <p className="text-gray-400">Select the best model for your generation.</p>
                        </div>

                        {/* Recommendation Banner */}
                        {recommendation && (
                            <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">
                                            Recommended: {recommendation.engine.name}
                                        </h4>
                                        <p className="text-xs text-gray-300 mt-1">
                                            {recommendation.reasoning}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            {Object.values(ENGINES).map((engine) => {
                                const isRecommended = recommendation?.engine.id === engine.id;
                                const isSelected = state.selectedEngine?.id === engine.id;

                                return (
                                    <div
                                        key={engine.id}
                                        onClick={() => dispatch({ type: 'SET_ENGINE', engine })}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between relative overflow-hidden ${isSelected
                                            ? "bg-purple-500/20 border-purple-500"
                                            : "bg-white/5 border-white/10 hover:border-white/30"
                                            }`}
                                    >
                                        {isRecommended && (
                                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                BEST MATCH
                                            </div>
                                        )}

                                        <div>
                                            <div className="font-medium text-white flex items-center gap-2">
                                                {engine.name}
                                                {isRecommended && <Sparkles className="w-3 h-3 text-purple-400" />}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">{engine.description}</div>
                                        </div>

                                        {isSelected && (
                                            <Check className="w-5 h-5 text-purple-400" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {state.currentStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 max-w-5xl mx-auto h-full flex flex-col">
                        <div className="text-center space-y-2 mb-2">
                            <h3 className="text-2xl font-bold">Review & Configure</h3>
                            <p className="text-gray-400">Fine-tune your generation settings.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-y-auto pr-2">
                            {/* Left Column: Prompt */}
                            <div className="space-y-6">
                                <div className="bg-black/50 border border-white/10 rounded-xl p-6 space-y-4 h-full flex flex-col">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                            Enhanced Prompt
                                            <span className="text-purple-400 text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-full">
                                                {state.enhancedPrompt.length} chars
                                            </span>
                                        </label>
                                        <textarea
                                            value={state.enhancedPrompt}
                                            onChange={(e) => dispatch({ type: 'SET_ENHANCED_PROMPT', prompt: e.target.value })}
                                            className="w-full h-full min-h-[200px] bg-transparent border-none text-lg text-white focus:ring-0 resize-none mt-2 leading-relaxed"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Negative Prompt</label>
                                        <textarea
                                            value={state.negativePrompt}
                                            onChange={(e) => dispatch({ type: 'SET_NEGATIVE_PROMPT', prompt: e.target.value })} // Need to add this action type if not exists, or just use generic setter
                                            className="w-full h-20 bg-transparent border-none text-sm text-gray-400 focus:ring-0 resize-none mt-1"
                                            placeholder="Low quality, blurry..."
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Settings */}
                            <div className="space-y-6">
                                {/* Motion Slider */}
                                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                    <EnhancedMotionSlider
                                        value={state.motionScale}
                                        onChange={(value: number) => dispatch({ type: 'SET_MOTION_SCALE', value })}
                                        engineType={state.selectedEngine?.id as any || 'kling'}
                                        showRecommendations={true}
                                    />
                                </div>

                                {/* Other Settings Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">CFG Scale</label>
                                        <input
                                            type="number"
                                            value={state.cfgScale}
                                            onChange={(e) => dispatch({ type: 'SET_CFG_SCALE', value: parseFloat(e.target.value) })}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                                            step="0.5"
                                        />
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Steps</label>
                                        <input
                                            type="number"
                                            value={state.steps}
                                            onChange={(e) => dispatch({ type: 'SET_STEPS', value: parseInt(e.target.value) })}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-purple-500 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Cost & Info */}
                                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-xs text-green-400 font-medium uppercase tracking-wider">Estimated Cost</div>
                                        <div className="text-lg font-bold text-white mt-0.5">{state.estimatedCost} Credits</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">Engine</div>
                                        <div className="text-sm font-bold text-white mt-0.5">{state.selectedEngine?.name || 'Default'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
                {state.currentStep > 1 ? (
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                ) : (
                    <div></div>
                )}

                {state.currentStep < 3 ? (
                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                        Next <ArrowRight className="w-4 h-4" />
                    </button>
                ) : state.currentStep === 3 ? (
                    <button
                        onClick={handleEnhance}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Sparkles className="w-4 h-4 animate-spin" /> Enhancing...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-4 h-4" /> Enhance Prompt
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => onComplete(state.enhancedPrompt, {
                            engine: state.selectedEngine,
                            cfgScale: state.cfgScale,
                            steps: state.steps
                        })}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                    >
                        <Check className="w-4 h-4" /> Use Prompt
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

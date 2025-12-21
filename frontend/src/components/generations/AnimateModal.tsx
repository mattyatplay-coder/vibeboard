 /* eslint-disable react-hooks/rules-of-hooks */
import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Video } from "lucide-react";
import { MagicPromptButton } from "./MagicPromptButton";
import { clsx } from "clsx";

interface AnimateModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    initialAspectRatio?: string;
    initialPrompt?: string;
    onAnimate: (prompt: string, aspectRatio: string, duration: number) => void;
    isGenerating: boolean;
}

export function AnimateModal({ isOpen, onClose, imageUrl, initialAspectRatio, initialPrompt, onAnimate, isGenerating }: AnimateModalProps) {
    const [prompt, setPrompt] = useState(initialPrompt || "");
    const [aspectRatio, setAspectRatio] = useState(initialAspectRatio || "16:9");
    const [duration, setDuration] = useState(5);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt || "");
            setAspectRatio(initialAspectRatio || "16:9");
            setDuration(5);
        }
    }, [isOpen, initialAspectRatio, initialPrompt]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#1a1a1a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-400" />
                        Animate Image
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Image Preview */}
                    <div className="relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-white/10">
                        <img
                            src={imageUrl}
                            alt="Source"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs text-white border border-white/10">
                            {aspectRatio}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-300">Animation Prompt</label>
                            <MagicPromptButton
                                currentPrompt={prompt}
                                onPromptEnhanced={setPrompt}
                            />
                        </div>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the motion (e.g., 'Slow pan right, wind blowing through hair')..."
                            className="w-full h-24 bg-black/50 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 resize-none text-sm"
                        />
                    </div>

                    {/* Aspect Ratio & Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Aspect Ratio</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setAspectRatio("16:9")}
                                    className={clsx(
                                        "flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all",
                                        aspectRatio === "16:9"
                                            ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    16:9
                                </button>
                                <button
                                    onClick={() => setAspectRatio("9:16")}
                                    className={clsx(
                                        "flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all",
                                        aspectRatio === "9:16"
                                            ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    9:16
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Duration</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDuration(5)}
                                    className={clsx(
                                        "flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all",
                                        duration === 5
                                            ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    5 sec
                                </button>
                                <button
                                    onClick={() => setDuration(10)}
                                    className={clsx(
                                        "flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all",
                                        duration === 10
                                            ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    10 sec
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-colors border border-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onAnimate(prompt, aspectRatio, duration)}
                            disabled={isGenerating || !prompt.trim()}
                            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Animating...
                                </>
                            ) : (
                                <>
                                    <Video className="w-4 h-4" />
                                    Generate Video
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

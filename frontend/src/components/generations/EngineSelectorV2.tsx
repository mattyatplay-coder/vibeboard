"use client";

import { useState } from "react";
import { ChevronDown, Video, Image as ImageIcon, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { EngineLibraryModal } from "./EngineLibraryModal";
import { ALL_MODELS, PROVIDER_DEFINITIONS, getModelsByCapability } from "@/lib/ModelRegistry";

interface EngineSelectorProps {
    selectedProvider: string;
    selectedModel: string;
    onSelect: (provider: string, model: string) => void;
    className?: string; // Support custom class names
    mode?: 'image' | 'video';
}

export function EngineSelectorV2({ selectedProvider, selectedModel, onSelect, className, mode }: EngineSelectorProps) {
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    // Find current model info
    const currentModel = ALL_MODELS.find(m => m.id === selectedModel);
    // Find current provider info
    const providerDef = currentModel
        ? PROVIDER_DEFINITIONS[currentModel.provider]
        : PROVIDER_DEFINITIONS[selectedProvider] || PROVIDER_DEFINITIONS['fal'];

    return (
        <div className={className}>
            <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                    Generation Engine
                </label>

                <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="group relative w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                            providerDef?.bgColor || "bg-gray-800"
                        )}>
                            {providerDef?.icon && <providerDef.icon className={clsx("w-5 h-5", providerDef.color)} />}
                        </div>

                        {/* Text */}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {currentModel?.name || "Select Model"}
                                </span>
                                {currentModel?.type === 'video' && (
                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-medium uppercase">
                                        Video
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={clsx("text-xs", providerDef?.color || "text-gray-400")}>
                                    {providerDef?.name || "Unknown Provider"}
                                </span>
                                <span className="text-xs text-gray-600">•</span>
                                <span className="text-xs text-gray-500 line-clamp-1 w-32 md:w-auto">
                                    {currentModel?.desc || "AI Generation Model"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </button>
            </div>

            <EngineLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                currentModelId={selectedModel}
                onSelect={(model) => onSelect(model.provider, model.id)}
                initialCategory={mode === 'video' ? 'text-to-video' : mode === 'image' ? 'text-to-image' : 'all'}
            />
        </div>
    );
}

/**
 * Simplified video-only provider selector
 * Used where only video generation is relevant (e.g. extending video)
 */
export function CloudVideoSelector({
    selected,
    onSelect
}: {
    selected: string;
    onSelect: (provider: string, model: string) => void;
}) {
    // Get unique providers that have video models
    const videoModels = getModelsByCapability('text-to-video').concat(getModelsByCapability('image-to-video'));
    const providerIds = Array.from(new Set(videoModels.map(m => m.provider)));

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Cloud Video Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
                {providerIds.map((providerId) => {
                    const provider = PROVIDER_DEFINITIONS[providerId];
                    const count = videoModels.filter(m => m.provider === providerId).length;

                    return (
                        <button
                            key={providerId}
                            onClick={() => {
                                // Select first video model for this provider
                                const defaultModel = videoModels.find(m => m.provider === providerId);
                                if (defaultModel) onSelect(providerId, defaultModel.id);
                            }}
                            className={clsx(
                                "flex flex-col items-center p-3 rounded-xl border transition-all",
                                selected === providerId
                                    ? `${provider.bgColor} border-current ${provider.color.replace('text-', 'border-')}`
                                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                            )}
                        >
                            <provider.icon className={clsx("w-6 h-6 mb-1", provider.color)} />
                            <span className="text-xs font-medium text-white">{provider.name}</span>
                            <span className="text-[10px] text-gray-500">
                                {count} models
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

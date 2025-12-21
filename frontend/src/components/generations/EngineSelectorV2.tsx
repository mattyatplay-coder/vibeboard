"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Video, Image as ImageIcon, Sparkles, Clock, Layers, Music, Mic } from "lucide-react";
import { clsx } from "clsx";
import { EngineLibraryModal } from "./EngineLibraryModal";
import { ALL_MODELS, PROVIDER_DEFINITIONS, getModelsByCapability } from "@/lib/ModelRegistry";

interface EngineSelectorProps {
    selectedProvider: string;
    selectedModel: string;
    onSelect: (provider: string, model: string) => void;
    className?: string; // Support custom class names
    mode?: 'image' | 'video';
    variant?: 'default' | 'compact';

    // New Props for internal controls
    quantity?: number;
    onQuantityChange?: (q: number) => void;
    duration?: string;
    onDurationChange?: (d: string) => void;
    audioFile?: File | null;
    onAudioChange?: (f: File | null) => void;
}

export function EngineSelectorV2({
    selectedProvider, selectedModel, onSelect, className, mode, variant = 'default',
    quantity, onQuantityChange,
    duration, onDurationChange,
    audioFile, onAudioChange
}: EngineSelectorProps) {
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    // Find current model info
    const currentModel = ALL_MODELS.find(m => m.id === selectedModel);
    // Find current provider info
    const providerDef = currentModel
        ? PROVIDER_DEFINITIONS[currentModel.provider]
        : PROVIDER_DEFINITIONS[selectedProvider] || PROVIDER_DEFINITIONS['fal'];

    // Capabilities
    const isVideo = currentModel?.type === 'video';
    const supportsAudio = currentModel?.capability === 'avatar' || currentModel?.capability === 'text-to-video' || currentModel?.capability === 'image-to-video';
    const supportedDurations = ['5', '10'];

    return (
        <div className={clsx("relative", className)}>
            <div className="flex flex-col gap-1.5">
                {variant === 'default' && (
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">
                        Generation Engine
                    </label>
                )}

                <div className="flex items-center gap-2">
                    {/* Main Selector */}
                    <button
                        onClick={() => setIsLibraryOpen(true)}
                        className={clsx(
                            "group relative flex-1 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all text-left",
                            variant === 'compact' ? "h-10 px-2" : "p-3"
                        )}
                        title="Change Model"
                    >
                        <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={clsx(
                                "rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                                providerDef?.bgColor || "bg-gray-800",
                                variant === 'compact' ? "w-6 h-6" : "w-10 h-10"
                            )}>
                                {providerDef?.icon && <providerDef.icon className={clsx(variant === 'compact' ? "w-3.5 h-3.5" : "w-5 h-5", providerDef.color)} />}
                            </div>

                            {/* Text */}
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={clsx(
                                        "font-bold text-white group-hover:text-blue-400 transition-colors truncate block max-w-[100px] sm:max-w-none",
                                        variant === 'compact' ? "text-xs" : "text-sm"
                                    )}>
                                        {currentModel?.name || "Select Model"}
                                    </span>
                                </div>
                                {variant === 'default' && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={clsx("text-xs", providerDef?.color || "text-gray-400")}>
                                            {providerDef?.name || "Unknown Provider"}
                                        </span>
                                        <span className="text-xs text-gray-600">•</span>
                                        <span className="text-xs text-gray-500 line-clamp-1 w-32 md:w-auto">
                                            {currentModel?.desc || "AI Generation Model"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <ChevronDown className={clsx(
                            "text-gray-500 group-hover:text-white transition-colors flex-shrink-0 ml-2",
                            variant === 'compact' ? "w-4 h-4" : "w-5 h-5"
                        )} />
                    </button>

                </div>
            </div>

            <EngineLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                currentModelId={selectedModel}
                onSelect={(model) => onSelect(model.provider, model.id)}
                initialCategory={mode === 'video' ? 'text-to-video' : mode === 'image' ? 'text-to-image' : 'all'}
                quantity={quantity}
                onQuantityChange={onQuantityChange}
                duration={duration}
                onDurationChange={onDurationChange}
                audioFile={audioFile}
                onAudioChange={onAudioChange}
            />
        </div >
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

"use client";

import { useState, useEffect } from "react";
import { 
    Cloud, Server, Zap, DollarSign, Info, Check, AlertCircle, 
    Video, Image, Sparkles, Bot, Banana, Play
} from "lucide-react";
import { clsx } from "clsx";
import { fetchAPI } from "@/lib/api";

interface ProviderInfo {
    type: string;
    name: string;
    icon: typeof Cloud;
    iconColor: string;
    bgColor: string;
    costPerImage: number;
    costPerVideo: number;
    supportsVideo: boolean;
    supportsImage: boolean;
    description: string;
    category: 'local' | 'cloud';
    models: { id: string; name: string; type: 'image' | 'video' | 'both' }[];
}

const PROVIDERS: Record<string, ProviderInfo> = {
    comfy: {
        type: 'comfy',
        name: 'ComfyUI',
        icon: Server,
        iconColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        costPerImage: 0,
        costPerVideo: 0,
        supportsVideo: true,
        supportsImage: true,
        description: 'Free - runs on your local hardware',
        category: 'local',
        models: [
            { id: 'sdxl', name: 'SDXL', type: 'image' },
            { id: 'flux-dev', name: 'Flux Dev', type: 'image' },
            { id: 'flux-schnell', name: 'Flux Schnell', type: 'image' },
            { id: 'ltx-video', name: 'LTX-Video', type: 'video' },
            { id: 'wan-2.2', name: 'Wan 2.2', type: 'video' },
            { id: 'animatediff', name: 'AnimateDiff', type: 'video' },
        ]
    },
    together: {
        type: 'together',
        name: 'Together AI',
        icon: Zap,
        iconColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        costPerImage: 0.0006,
        costPerVideo: 999,
        supportsVideo: false,
        supportsImage: true,
        description: 'Cheapest API - $0.0006/image, free tier available',
        category: 'cloud',
        models: [
            { id: 'black-forest-labs/FLUX.1-schnell-Free', name: 'Flux Schnell (Free)', type: 'image' },
            { id: 'black-forest-labs/FLUX.1-schnell', name: 'Flux Schnell', type: 'image' },
            { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux Dev', type: 'image' },
        ]
    },
    huggingface: {
        type: 'huggingface',
        name: 'HuggingFace',
        icon: Cloud,
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        costPerImage: 0,
        costPerVideo: 0.01,
        supportsVideo: true,
        supportsImage: true,
        description: 'Free tier - rate limited ~1000/day',
        category: 'cloud',
        models: [
            { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL', type: 'image' },
            { id: 'black-forest-labs/FLUX.1-dev', name: 'Flux Dev', type: 'image' },
            { id: 'ali-vilab/text-to-video-ms-1.7b', name: 'Text-to-Video MS', type: 'video' },
        ]
    },
    replicate: {
        type: 'replicate',
        name: 'Replicate',
        icon: Cloud,
        iconColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        costPerImage: 0.003,
        costPerVideo: 0.05,
        supportsVideo: true,
        supportsImage: true,
        description: 'Wide model selection, pay-per-use',
        category: 'cloud',
        models: [
            { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', type: 'image' },
            { id: 'black-forest-labs/flux-dev', name: 'Flux Dev', type: 'image' },
            { id: 'stability-ai/sdxl', name: 'SDXL', type: 'image' },
            { id: 'fofr/ltx-video', name: 'LTX-Video', type: 'video' },
            { id: 'lucataco/animate-diff', name: 'AnimateDiff', type: 'video' },
        ]
    },
    fal: {
        type: 'fal',
        name: 'Fal.ai',
        icon: Cloud,
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        costPerImage: 0.003,
        costPerVideo: 0.08,
        supportsVideo: true,
        supportsImage: true,
        description: 'Fast & reliable cloud generation',
        category: 'cloud',
        models: [
            { id: 'fal-ai/flux/dev', name: 'Flux Dev', type: 'image' },
            { id: 'fal-ai/flux-pro', name: 'Flux Pro', type: 'image' },
            { id: 'fal-ai/flux-2-flex', name: 'Flux 2', type: 'image' },
            { id: 'fal-ai/wan-t2v', name: 'Wan 2.2 T2V', type: 'video' },
            { id: 'fal-ai/wan/v2.2-a14b/image-to-video', name: 'Wan 2.2 I2V', type: 'video' },
            { id: 'fal-ai/ltx-video/image-to-video', name: 'LTX-Video', type: 'video' },
            { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', name: 'Kling 2.1', type: 'video' },
            { id: 'fal-ai/minimax-video', name: 'MiniMax Video', type: 'video' },
        ]
    },
    banana: {
        type: 'banana',
        name: 'Banana Dev',
        icon: Sparkles,
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        costPerImage: 0.01,
        costPerVideo: 0.15,
        supportsVideo: true,
        supportsImage: true,
        description: 'Serverless GPU - deploy custom models',
        category: 'cloud',
        models: [
            { id: 'custom-sdxl', name: 'Custom SDXL', type: 'image' },
            { id: 'custom-flux', name: 'Custom Flux', type: 'image' },
            { id: 'custom-ltx', name: 'Custom LTX-Video', type: 'video' },
            { id: 'custom-wan', name: 'Custom Wan', type: 'video' },
        ]
    },
    google: {
        type: 'google',
        name: 'Google Veo',
        icon: Play,
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        costPerImage: 0.02,
        costPerVideo: 0.15,
        supportsVideo: true,
        supportsImage: true,
        description: 'Google AI - Imagen 3 & Veo 3.1',
        category: 'cloud',
        models: [
            { id: 'imagen-3', name: 'Imagen 3', type: 'image' },
            { id: 'veo-2', name: 'Veo 2', type: 'video' },
            { id: 'veo-3', name: 'Veo 3', type: 'video' },
            { id: 'veo-3.1', name: 'Veo 3.1 (Latest)', type: 'video' },
        ]
    },
    openai: {
        type: 'openai',
        name: 'OpenAI',
        icon: Bot,
        iconColor: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        costPerImage: 0.04,
        costPerVideo: 0.50,
        supportsVideo: true,
        supportsImage: true,
        description: 'DALL-E 3 & Sora video',
        category: 'cloud',
        models: [
            { id: 'dall-e-3', name: 'DALL-E 3', type: 'image' },
            { id: 'dall-e-2', name: 'DALL-E 2', type: 'image' },
            { id: 'sora', name: 'Sora (When Available)', type: 'video' },
        ]
    }
};

interface EngineConfig {
    provider: string;
    model: string;
}

interface EngineSelectorProps {
    config: EngineConfig;
    onChange: (config: EngineConfig) => void;
    mode: 'image' | 'video';
}

export function EngineSelectorV2({ config, onChange, mode }: EngineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [availableProviders, setAvailableProviders] = useState<string[]>(Object.keys(PROVIDERS));
    const [estimatedCost, setEstimatedCost] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('cloud');

    // Fetch available providers from backend
    useEffect(() => {
        fetchAPI('/providers')
            .then(data => {
                setAvailableProviders(data.map((p: any) => p.type));
            })
            .catch(() => {
                // Fallback to all providers
                setAvailableProviders(Object.keys(PROVIDERS));
            });
    }, []);

    // Calculate estimated cost
    useEffect(() => {
        const provider = PROVIDERS[config.provider];
        if (provider) {
            const cost = mode === 'video' ? provider.costPerVideo : provider.costPerImage;
            setEstimatedCost(cost);
        }
    }, [config.provider, mode]);

    const currentProvider = PROVIDERS[config.provider];
    const filteredModels = currentProvider?.models.filter(
        m => m.type === mode || m.type === 'both'
    ) || [];

    const handleProviderChange = (providerType: string) => {
        const provider = PROVIDERS[providerType];
        const defaultModel = provider?.models.find(m => m.type === mode || m.type === 'both');
        onChange({
            provider: providerType,
            model: defaultModel?.id || ''
        });
    };

    const formatCost = (cost: number) => {
        if (cost === 0) return 'Free';
        if (cost >= 999) return 'N/A';
        return `$${cost.toFixed(4)}`;
    };

    // Group providers by category
    const localProviders = Object.entries(PROVIDERS).filter(([_, p]) => p.category === 'local');
    const cloudProviders = Object.entries(PROVIDERS).filter(([_, p]) => p.category === 'cloud');

    // Filter by mode support
    const getProvidersForMode = (providers: [string, ProviderInfo][]) => {
        return providers.filter(([_, p]) => mode === 'image' ? p.supportsImage : p.supportsVideo);
    };

    return (
        <div className="relative">
            {/* Compact trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs transition-colors"
            >
                {currentProvider && (
                    <>
                        <currentProvider.icon className={clsx("w-3.5 h-3.5", currentProvider.iconColor)} />
                        <span className="font-medium text-white">{currentProvider.name}</span>
                        <span className="text-gray-500">|</span>
                        <span className="text-gray-400">
                            {filteredModels.find(m => m.id === config.model)?.name || 'Select model'}
                        </span>
                    </>
                )}
                {estimatedCost > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-[10px]">
                        ~{formatCost(estimatedCost)}
                    </span>
                )}
                {estimatedCost === 0 && currentProvider && (
                    <span className="ml-1 px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">
                        Free
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-2 w-96 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-3 border-b border-white/10 bg-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        {mode === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                                        {mode === 'video' ? 'Video Engine' : 'Image Engine'}
                                    </h3>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Select provider and model
                                    </p>
                                </div>
                                {/* Cost badge */}
                                <div className={clsx(
                                    "px-2 py-1 rounded-lg text-xs font-medium",
                                    estimatedCost === 0 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                                )}>
                                    {formatCost(estimatedCost)}/{mode === 'video' ? 'video' : 'image'}
                                </div>
                            </div>
                        </div>

                        {/* Tabs for Local/Cloud */}
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('local')}
                                className={clsx(
                                    "flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2",
                                    activeTab === 'local' 
                                        ? "bg-green-500/10 text-green-400 border-b-2 border-green-500"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <Server className="w-3.5 h-3.5" />
                                Local (Free)
                            </button>
                            <button
                                onClick={() => setActiveTab('cloud')}
                                className={clsx(
                                    "flex-1 px-3 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2",
                                    activeTab === 'cloud' 
                                        ? "bg-blue-500/10 text-blue-400 border-b-2 border-blue-500"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                <Cloud className="w-3.5 h-3.5" />
                                Cloud ({mode === 'video' ? '7' : '8'} providers)
                            </button>
                        </div>

                        {/* Provider selection */}
                        <div className="p-3 border-b border-white/10 max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                                {getProvidersForMode(activeTab === 'local' ? localProviders : cloudProviders)
                                    .map(([key, provider]) => {
                                        const isAvailable = availableProviders.includes(key);
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => isAvailable && handleProviderChange(key)}
                                                disabled={!isAvailable}
                                                className={clsx(
                                                    "flex flex-col items-start p-2.5 rounded-lg border transition-all text-left",
                                                    !isAvailable && "opacity-50 cursor-not-allowed",
                                                    config.provider === key
                                                        ? `${provider.bgColor} border-current ${provider.iconColor.replace('text-', 'border-')}`
                                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 mb-1 w-full">
                                                    <div className={clsx("p-1 rounded", provider.bgColor)}>
                                                        <provider.icon className={clsx("w-3.5 h-3.5", provider.iconColor)} />
                                                    </div>
                                                    <span className={clsx(
                                                        "text-xs font-medium flex-1",
                                                        config.provider === key ? "text-white" : "text-gray-300"
                                                    )}>
                                                        {provider.name}
                                                    </span>
                                                    {!isAvailable && (
                                                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                                                    )}
                                                    {config.provider === key && (
                                                        <Check className="w-3.5 h-3.5 text-blue-400" />
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={clsx(
                                                        "text-[10px]",
                                                        (mode === 'video' ? provider.costPerVideo : provider.costPerImage) === 0
                                                            ? "text-green-400"
                                                            : "text-gray-500"
                                                    )}>
                                                        {formatCost(mode === 'video' ? provider.costPerVideo : provider.costPerImage)}
                                                    </span>
                                                    {mode === 'video' && provider.supportsVideo && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                                            {provider.models.filter(m => m.type === 'video').length} models
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* Show unavailable notice */}
                            {getProvidersForMode(activeTab === 'local' ? localProviders : cloudProviders)
                                .filter(([key]) => !availableProviders.includes(key)).length > 0 && (
                                <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Grayed providers need API keys in settings
                                </div>
                            )}
                        </div>

                        {/* Model selection */}
                        {currentProvider && filteredModels.length > 0 && (
                            <div className="p-3">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                                    Model ({filteredModels.length} available)
                                </label>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {filteredModels.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                onChange({ ...config, model: model.id });
                                                setIsOpen(false);
                                            }}
                                            className={clsx(
                                                "w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left",
                                                config.model === model.id
                                                    ? "bg-blue-500/20 border-blue-500"
                                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {model.type === 'video' ? (
                                                    <Video className="w-3 h-3 text-purple-400" />
                                                ) : (
                                                    <Image className="w-3 h-3 text-blue-400" />
                                                )}
                                                <span className={clsx(
                                                    "text-xs",
                                                    config.model === model.id ? "text-white" : "text-gray-300"
                                                )}>
                                                    {model.name}
                                                </span>
                                            </div>
                                            {config.model === model.id && (
                                                <Check className="w-3.5 h-3.5 text-blue-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Provider info */}
                        {currentProvider && (
                            <div className="p-3 bg-white/5 border-t border-white/10">
                                <div className="flex items-start gap-2">
                                    <Info className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-[10px] text-gray-400">
                                        {currentProvider.description}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Simplified video-only provider selector
 */
export function CloudVideoSelector({ 
    selected, 
    onSelect 
}: { 
    selected: string; 
    onSelect: (provider: string, model: string) => void;
}) {
    const videoProviders = Object.entries(PROVIDERS)
        .filter(([_, p]) => p.supportsVideo && p.category === 'cloud');

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Cloud Video Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
                {videoProviders.map(([key, provider]) => (
                    <button
                        key={key}
                        onClick={() => {
                            const defaultModel = provider.models.find(m => m.type === 'video');
                            onSelect(key, defaultModel?.id || '');
                        }}
                        className={clsx(
                            "flex flex-col items-center p-3 rounded-xl border transition-all",
                            selected === key
                                ? `${provider.bgColor} border-current ${provider.iconColor.replace('text-', 'border-')}`
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                        )}
                    >
                        <provider.icon className={clsx("w-6 h-6 mb-1", provider.iconColor)} />
                        <span className="text-xs font-medium text-white">{provider.name}</span>
                        <span className="text-[10px] text-gray-500">
                            {provider.models.filter(m => m.type === 'video').length} models
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

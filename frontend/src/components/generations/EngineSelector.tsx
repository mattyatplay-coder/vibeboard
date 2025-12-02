import { useState, useEffect } from "react";
import { Cloud, Server, Settings } from "lucide-react";
import { clsx } from "clsx";

interface EngineConfig {
    type: 'fal' | 'comfy';
    comfyUrl?: string;
    falKey?: string;
    falModel?: string; // 'fal-ai/flux/dev' | 'fal-ai/flux-2-flex'
}

interface EngineSelectorProps {
    config: EngineConfig;
    onChange: (config: EngineConfig) => void;
}

export function EngineSelector({ config, onChange }: EngineSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localUrl, setLocalUrl] = useState(config.comfyUrl || "http://127.0.0.1:8188");

    const handleTypeChange = (type: 'fal' | 'comfy') => {
        onChange({ ...config, type });
    };

    const handleUrlChange = (url: string) => {
        setLocalUrl(url);
        onChange({ ...config, comfyUrl: url });
    };

    const handleModelChange = (model: string) => {
        onChange({ ...config, falModel: model });
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors"
            >
                {config.type === 'fal' ? <Cloud className="w-3 h-3 text-blue-400" /> : <Server className="w-3 h-3 text-green-400" />}
                <span className="font-medium">
                    {config.type === 'fal'
                        ? (config.falModel?.includes('wan') ? 'Cloud (Wan 2.2)'
                            : config.falModel?.includes('ltx') ? 'Cloud (LTX-Video)'
                                : config.falModel?.includes('kling') ? 'Cloud (Kling 2.1)'
                                    : (config.falModel?.includes('flux-2') ? 'Cloud (Flux 2)' : 'Cloud (Flux 1)'))
                        : 'Local (ComfyUI)'}
                </span>
                <Settings className="w-3 h-3 opacity-50 ml-1" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-xl z-50 p-4 space-y-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Generation Engine</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleTypeChange('fal')}
                                    className={clsx(
                                        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                                        config.type === 'fal'
                                            ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    <Cloud className="w-5 h-5" />
                                    <span className="text-xs font-medium">Cloud</span>
                                </button>
                                <button
                                    onClick={() => handleTypeChange('comfy')}
                                    className={clsx(
                                        "flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                                        config.type === 'comfy'
                                            ? "bg-green-500/10 border-green-500 text-green-400"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    <Server className="w-5 h-5" />
                                    <span className="text-xs font-medium">Local</span>
                                </button>
                            </div>
                        </div>

                        {config.type === 'comfy' && (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    ComfyUI URL
                                </label>
                                <input
                                    type="text"
                                    value={localUrl}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-green-500 outline-none font-mono"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">
                                    Ensure ComfyUI is running with <code>--listen</code> or CORS enabled.
                                </p>
                            </div>
                        )}

                        {config.type === 'fal' && (
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                    Model Selection
                                </label>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handleModelChange('fal-ai/flux/dev')}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-2 rounded border text-left transition-all",
                                            (!config.falModel || config.falModel === 'fal-ai/flux/dev')
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs">Flux.1 [dev]</span>
                                        {(!config.falModel || config.falModel === 'fal-ai/flux/dev') && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                    <button
                                        onClick={() => handleModelChange('fal-ai/flux-2-flex')}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-2 rounded border text-left transition-all",
                                            config.falModel === 'fal-ai/flux-2-flex'
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs">Flux 2 [flex]</span>
                                        {config.falModel === 'fal-ai/flux-2-flex' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                    <button
                                        onClick={() => handleModelChange('fal-ai/wan-t2v')}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-2 rounded border text-left transition-all",
                                            (config.falModel?.includes('wan'))
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs">Wan 2.2 [video]</span>
                                        {(config.falModel?.includes('wan')) && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                    <button
                                        onClick={() => handleModelChange('fal-ai/ltx-video/image-to-video')}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-2 rounded border text-left transition-all",
                                            (config.falModel?.includes('ltx'))
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs">LTX-Video [video]</span>
                                        {(config.falModel?.includes('ltx')) && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                    <button
                                        onClick={() => handleModelChange('fal-ai/kling-video/v2.1/standard/image-to-video')}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-2 rounded border text-left transition-all",
                                            (config.falModel?.includes('kling'))
                                                ? "bg-blue-500/20 border-blue-500 text-white"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span className="text-xs">Kling 2.1 [video]</span>
                                        {(config.falModel?.includes('kling')) && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-blue-300 mt-2">
                                    {config.falModel === 'fal-ai/flux-2-flex'
                                        ? "Newest Flux model. Higher quality & flexibility."
                                        : (config.falModel?.includes('video') || config.falModel?.includes('wan') || config.falModel?.includes('ltx') || config.falModel?.includes('kling'))
                                            ? "Video generation model."
                                            : "Standard Flux.1 Dev model. Reliable & fast."}
                                </p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Cloud, Server, Settings } from 'lucide-react';
import { clsx } from 'clsx';

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
  const [localUrl, setLocalUrl] = useState(config.comfyUrl || 'http://127.0.0.1:8188');

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
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
      >
        {config.type === 'fal' ? (
          <Cloud className="h-3 w-3 text-blue-400" />
        ) : (
          <Server className="h-3 w-3 text-green-400" />
        )}
        <span className="font-medium">
          {config.type === 'fal'
            ? config.falModel?.includes('wan')
              ? 'Cloud (Wan 2.2)'
              : config.falModel?.includes('ltx')
                ? 'Cloud (LTX-Video)'
                : config.falModel?.includes('kling')
                  ? 'Cloud (Kling 2.1)'
                  : config.falModel?.includes('flux-2')
                    ? 'Cloud (Flux 2)'
                    : 'Cloud (Flux 1)'
            : 'Local (ComfyUI)'}
        </span>
        <Settings className="ml-1 h-3 w-3 opacity-50" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 bottom-full z-50 mb-2 w-64 space-y-4 rounded-xl border border-white/20 bg-[#1a1a1a] p-4 shadow-xl">
            <div>
              <h3 className="mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
                Generation Engine
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTypeChange('fal')}
                  className={clsx(
                    'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                    config.type === 'fal'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  )}
                >
                  <Cloud className="h-5 w-5" />
                  <span className="text-xs font-medium">Cloud</span>
                </button>
                <button
                  onClick={() => handleTypeChange('comfy')}
                  className={clsx(
                    'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                    config.type === 'comfy'
                      ? 'border-green-500 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                  )}
                >
                  <Server className="h-5 w-5" />
                  <span className="text-xs font-medium">Local</span>
                </button>
              </div>
            </div>

            {config.type === 'comfy' && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  ComfyUI URL
                </label>
                <input
                  type="text"
                  value={localUrl}
                  onChange={e => handleUrlChange(e.target.value)}
                  className="w-full rounded border border-white/10 bg-black/50 px-2 py-1.5 font-mono text-xs text-white outline-none focus:border-green-500"
                />
                <p className="mt-1 text-[10px] text-gray-500">
                  Ensure ComfyUI is running with <code>--listen</code> or CORS enabled.
                </p>
              </div>
            )}

            {config.type === 'fal' && (
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                  Model Selection
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => handleModelChange('fal-ai/flux/dev')}
                    className={clsx(
                      'flex w-full items-center justify-between rounded border p-2 text-left transition-all',
                      !config.falModel || config.falModel === 'fal-ai/flux/dev'
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs">Flux.1 [dev]</span>
                    {(!config.falModel || config.falModel === 'fal-ai/flux/dev') && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleModelChange('fal-ai/flux-2-flex')}
                    className={clsx(
                      'flex w-full items-center justify-between rounded border p-2 text-left transition-all',
                      config.falModel === 'fal-ai/flux-2-flex'
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs">Flux 2 [flex]</span>
                    {config.falModel === 'fal-ai/flux-2-flex' && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleModelChange('fal-ai/wan-t2v')}
                    className={clsx(
                      'flex w-full items-center justify-between rounded border p-2 text-left transition-all',
                      config.falModel?.includes('wan')
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs">Wan 2.2 [video]</span>
                    {config.falModel?.includes('wan') && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleModelChange('fal-ai/ltx-video/image-to-video')}
                    className={clsx(
                      'flex w-full items-center justify-between rounded border p-2 text-left transition-all',
                      config.falModel?.includes('ltx')
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs">LTX-Video [video]</span>
                    {config.falModel?.includes('ltx') && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleModelChange('fal-ai/kling-video/v2.1/standard/image-to-video')
                    }
                    className={clsx(
                      'flex w-full items-center justify-between rounded border p-2 text-left transition-all',
                      config.falModel?.includes('kling')
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs">Kling 2.1 [video]</span>
                    {config.falModel?.includes('kling') && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-blue-300">
                  {config.falModel === 'fal-ai/flux-2-flex'
                    ? 'Newest Flux model. Higher quality & flexibility.'
                    : config.falModel?.includes('video') ||
                        config.falModel?.includes('wan') ||
                        config.falModel?.includes('ltx') ||
                        config.falModel?.includes('kling')
                      ? 'Video generation model.'
                      : 'Standard Flux.1 Dev model. Reliable & fast.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

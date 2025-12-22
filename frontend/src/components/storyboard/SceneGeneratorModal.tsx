'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface SceneGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: SceneGenerationConfig) => void;
  sceneName: string;
}

export interface SceneGenerationConfig {
  prompt: string;
  shotTypes: string[];
  cameraAngles: string[];
  location: string;
  lighting: string;
  resolution: '1080p' | '1440p' | '4k';
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.35:1';
  variations: number;
  mode: 'text_to_video' | 'image_to_video' | 'frames_to_video' | 'extend_video';
  startFrame?: File | null;
  endFrame?: File | null;
  inputVideo?: File | null;
  cameraMovement?: { type: string; direction?: string; intensity?: number };
}

const GENERATION_MODES = [
  { id: 'text_to_video', label: 'Text to Video', icon: '📝' },
  { id: 'image_to_video', label: 'Image to Video', icon: '🖼️' },
  { id: 'frames_to_video', label: 'Frames to Video', icon: '🎞️' },
  { id: 'extend_video', label: 'Extend Video', icon: '⏩' },
];

const SHOT_TYPES = [
  'Close-up',
  'Medium Shot',
  'Wide Shot',
  'Extreme Wide Shot',
  'Macro',
  'Over the Shoulder',
];
const CAMERA_ANGLES = [
  'Eye Level',
  'Low Angle',
  'High Angle',
  "Bird's Eye",
  'Dutch Angle',
  "Worm's Eye",
];
const RESOLUTIONS = ['1080p', '1440p', '4k'];
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '2.35:1'];

export function SceneGeneratorModal({
  isOpen,
  onClose,
  onGenerate,
  sceneName,
}: SceneGeneratorModalProps) {
  const [config, setConfig] = useState<SceneGenerationConfig>({
    prompt: '',
    shotTypes: [],
    cameraAngles: [],
    location: '',
    lighting: '',
    resolution: '1080p',
    aspectRatio: '16:9',
    variations: 1,
    mode: 'text_to_video',
    startFrame: null,
    endFrame: null,
    inputVideo: null,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simulate generation delay for now or just pass config
    onGenerate(config);
    setIsGenerating(false);
    onClose();
  };

  const handleFileChange = (field: 'startFrame' | 'endFrame' | 'inputVideo', file: File | null) => {
    setConfig(prev => ({ ...prev, [field]: file }));
  };

  const toggleSelection = (field: 'shotTypes' | 'cameraAngles', value: string) => {
    setConfig(prev => {
      const current = prev[field];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [field]: updated };
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-6">
              <div>
                <h2 className="text-xl font-bold text-white">Generate Scene</h2>
                <p className="text-sm text-gray-400">Configure generation for "{sceneName}"</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Mode Selector */}
              <div className="flex rounded-lg border border-white/10 bg-black/30 p-1">
                {GENERATION_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setConfig({ ...config, mode: mode.id as any })}
                    className={clsx(
                      'flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-all',
                      config.mode === mode.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <span>{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Mode Specific Inputs */}
              {config.mode === 'image_to_video' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Start Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileChange('startFrame', e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                  />
                </div>
              )}

              {config.mode === 'frames_to_video' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      Start Frame
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange('startFrame', e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-400">
                      End Frame
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileChange('endFrame', e.target.files?.[0] || null)}
                      className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                    />
                  </div>
                </div>
              )}

              {config.mode === 'extend_video' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Input Video
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => handleFileChange('inputVideo', e.target.files?.[0] || null)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
                  />
                </div>
              )}
              {/* Prompt */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-400">Scene Prompt</label>
                <textarea
                  value={config.prompt}
                  onChange={e => setConfig({ ...config, prompt: e.target.value })}
                  className="h-32 w-full resize-none rounded-lg border border-white/10 bg-black/50 p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Describe the scene in detail..."
                />
              </div>

              {/* Shot Types & Camera Angles */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Shot Types</label>
                  <div className="flex flex-wrap gap-2">
                    {SHOT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleSelection('shotTypes', type)}
                        className={clsx(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          config.shotTypes.includes(type)
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-white/10 bg-black/30 text-gray-400 hover:bg-white/5'
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Camera Angles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CAMERA_ANGLES.map(angle => (
                      <button
                        key={angle}
                        onClick={() => toggleSelection('cameraAngles', angle)}
                        className={clsx(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                          config.cameraAngles.includes(angle)
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-white/10 bg-black/30 text-gray-400 hover:bg-white/5'
                        )}
                      >
                        {angle}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Location & Lighting */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Location</label>
                  <input
                    type="text"
                    value={config.location}
                    onChange={e => setConfig({ ...config, location: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Cyberpunk City Street"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Lighting</label>
                  <input
                    type="text"
                    value={config.lighting}
                    onChange={e => setConfig({ ...config, lighting: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. Neon, Golden Hour"
                  />
                </div>
              </div>

              {/* Technical Settings */}
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Resolution</label>
                  <select
                    value={config.resolution}
                    onChange={e => setConfig({ ...config, resolution: e.target.value as any })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {RESOLUTIONS.map(res => (
                      <option key={res} value={res}>
                        {res}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Aspect Ratio
                  </label>
                  <select
                    value={config.aspectRatio}
                    onChange={e => setConfig({ ...config, aspectRatio: e.target.value as any })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {ASPECT_RATIOS.map(ratio => (
                      <option key={ratio} value={ratio}>
                        {ratio}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-400">Variations</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={config.variations}
                    onChange={e => setConfig({ ...config, variations: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-white/10 bg-black/50 p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-white/10 bg-white/5 p-6">
              <button
                onClick={onClose}
                className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !config.prompt.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Scene
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

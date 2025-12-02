"use client";

import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

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
}

const GENERATION_MODES = [
    { id: 'text_to_video', label: 'Text to Video', icon: '📝' },
    { id: 'image_to_video', label: 'Image to Video', icon: '🖼️' },
    { id: 'frames_to_video', label: 'Frames to Video', icon: '🎞️' },
    { id: 'extend_video', label: 'Extend Video', icon: '⏩' },
];

const SHOT_TYPES = ["Close-up", "Medium Shot", "Wide Shot", "Extreme Wide Shot", "Macro", "Over the Shoulder"];
const CAMERA_ANGLES = ["Eye Level", "Low Angle", "High Angle", "Bird's Eye", "Dutch Angle", "Worm's Eye"];
const RESOLUTIONS = ["1080p", "1440p", "4k"];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "2.35:1"];

export function SceneGeneratorModal({ isOpen, onClose, onGenerate, sceneName }: SceneGeneratorModalProps) {
    const [config, setConfig] = useState<SceneGenerationConfig>({
        prompt: "",
        shotTypes: [],
        cameraAngles: [],
        location: "",
        lighting: "",
        resolution: "1080p",
        aspectRatio: "16:9",
        variations: 1,
        mode: 'text_to_video',
        startFrame: null,
        endFrame: null,
        inputVideo: null
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative w-full max-w-2xl bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">Generate Scene</h2>
                                <p className="text-sm text-gray-400">Configure generation for "{sceneName}"</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Mode Selector */}
                            <div className="flex bg-black/30 p-1 rounded-lg border border-white/10">
                                {GENERATION_MODES.map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setConfig({ ...config, mode: mode.id as any })}
                                        className={clsx(
                                            "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                            config.mode === mode.id
                                                ? "bg-blue-600 text-white shadow-lg"
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
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
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Start Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange('startFrame', e.target.files?.[0] || null)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                    />
                                </div>
                            )}

                            {config.mode === 'frames_to_video' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Start Frame</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange('startFrame', e.target.files?.[0] || null)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">End Frame</label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange('endFrame', e.target.files?.[0] || null)}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {config.mode === 'extend_video' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Input Video</label>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => handleFileChange('inputVideo', e.target.files?.[0] || null)}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
                                    />
                                </div>
                            )}
                            {/* Prompt */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Scene Prompt</label>
                                <textarea
                                    value={config.prompt}
                                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                                    className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Describe the scene in detail..."
                                />
                            </div>

                            {/* Shot Types & Camera Angles */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Shot Types</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SHOT_TYPES.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => toggleSelection('shotTypes', type)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                    config.shotTypes.includes(type)
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Camera Angles</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CAMERA_ANGLES.map(angle => (
                                            <button
                                                key={angle}
                                                onClick={() => toggleSelection('cameraAngles', angle)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                                                    config.cameraAngles.includes(angle)
                                                        ? "bg-blue-600 border-blue-500 text-white"
                                                        : "bg-black/30 border-white/10 text-gray-400 hover:bg-white/5"
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
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Location</label>
                                    <input
                                        type="text"
                                        value={config.location}
                                        onChange={(e) => setConfig({ ...config, location: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Cyberpunk City Street"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Lighting</label>
                                    <input
                                        type="text"
                                        value={config.lighting}
                                        onChange={(e) => setConfig({ ...config, lighting: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Neon, Golden Hour"
                                    />
                                </div>
                            </div>

                            {/* Technical Settings */}
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Resolution</label>
                                    <select
                                        value={config.resolution}
                                        onChange={(e) => setConfig({ ...config, resolution: e.target.value as any })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {RESOLUTIONS.map(res => (
                                            <option key={res} value={res}>{res}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Aspect Ratio</label>
                                    <select
                                        value={config.aspectRatio}
                                        onChange={(e) => setConfig({ ...config, aspectRatio: e.target.value as any })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {ASPECT_RATIOS.map(ratio => (
                                            <option key={ratio} value={ratio}>{ratio}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Variations</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="4"
                                        value={config.variations}
                                        onChange={(e) => setConfig({ ...config, variations: parseInt(e.target.value) })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !config.prompt.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Generate Scene
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

"use client";

import { useState } from "react";
import {
    FastForward,
    ImageIcon,
    Palette,
    Cloud,
    Sun,
    Moon,
    Snowflake,
    Droplets,
    Wind,
    Camera,
    RotateCcw,
    ArrowRight,
    ArrowLeft,
    Wand2,
    Copy,
    Check,
    X,
    Film
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { CameraPresetSelector } from "./CameraPresetSelector";
import { CameraPreset, getPresetById } from "@/data/CameraPresets";
import { Genre } from "@/data/GenreTemplates";

interface ShotActionsPanelProps {
    shot: any;
    onGrabLastFrame: (shotId: string) => void;
    onGrabFirstFrame: (shotId: string) => void;
    onV2VEdit: (shotId: string, editType: string, prompt: string) => void;
    onPredictNextShot: (shotId: string, prompt: string) => void;
    onPredictPreviousShot: (shotId: string, prompt: string) => void;
    isProcessing?: boolean;
    genre?: Genre | null; // Current project/scene genre for camera recommendations
    onCameraPresetSelect?: (preset: CameraPreset) => void;
}

const WEATHER_PRESETS = [
    { id: "sunny", label: "Sunny", icon: Sun, prompt: "bright sunny day, clear blue sky" },
    { id: "night", label: "Night", icon: Moon, prompt: "nighttime, dark sky with stars, moonlight" },
    { id: "rain", label: "Rainy", icon: Droplets, prompt: "heavy rain, wet surfaces, rain drops" },
    { id: "snow", label: "Snowy", icon: Snowflake, prompt: "snowfall, snow covered ground, winter" },
    { id: "fog", label: "Foggy", icon: Cloud, prompt: "thick fog, misty atmosphere, low visibility" },
    { id: "storm", label: "Stormy", icon: Wind, prompt: "thunderstorm, dark clouds, lightning" }
];

export function ShotActionsPanel({
    shot,
    onGrabLastFrame,
    onGrabFirstFrame,
    onV2VEdit,
    onPredictNextShot,
    onPredictPreviousShot,
    isProcessing = false,
    genre = null,
    onCameraPresetSelect
}: ShotActionsPanelProps) {
    const [activeTab, setActiveTab] = useState<"extend" | "edit" | "camera" | "predict">("extend");
    const [customPrompt, setCustomPrompt] = useState("");
    const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
    const [selectedCameraPreset, setSelectedCameraPreset] = useState<string | null>(null);
    const [selectedMixPresets, setSelectedMixPresets] = useState<string[]>([]);
    const [backgroundPrompt, setBackgroundPrompt] = useState("");

    const handleWeatherChange = (weather: typeof WEATHER_PRESETS[0]) => {
        setSelectedWeather(weather.id);
        onV2VEdit(shot.id, "weather", `Change the weather to ${weather.prompt}`);
    };

    const handleCameraPresetSelect = (preset: CameraPreset) => {
        if (!preset.id) {
            // Clear selection
            setSelectedCameraPreset(null);
            return;
        }
        setSelectedCameraPreset(preset.id);
        onV2VEdit(shot.id, "camera", `Change the camera to ${preset.prompt}`);
        onCameraPresetSelect?.(preset);
    };

    const handleMixedCameraSelect = (presetIds: string[]) => {
        setSelectedMixPresets(presetIds);
        if (presetIds.length > 0) {
            const combinedPrompt = presetIds
                .map(id => getPresetById(id)?.prompt)
                .filter(Boolean)
                .join(", ");
            onV2VEdit(shot.id, "camera", `Camera movement: ${combinedPrompt}`);
        }
    };

    const handleBackgroundChange = () => {
        if (!backgroundPrompt.trim()) return;
        onV2VEdit(shot.id, "background", `Change the background to ${backgroundPrompt}`);
        setBackgroundPrompt("");
    };

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                {[
                    { id: "extend", label: "Extend", icon: FastForward },
                    { id: "camera", label: "Camera", icon: Film },
                    { id: "edit", label: "V2V Edit", icon: Palette },
                    { id: "predict", label: "Next/Prev", icon: Camera }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors",
                            activeTab === tab.id
                                ? "bg-blue-600/20 text-blue-400 border-b-2 border-blue-500"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-4">
                <AnimatePresence mode="wait">
                    {/* Extend Tab - Grab Last Frame */}
                    {activeTab === "extend" && (
                        <motion.div
                            key="extend"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="text-center space-y-2">
                                <p className="text-xs text-gray-400">
                                    Create seamless extensions by using the last frame as the next starting point
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onGrabFirstFrame(shot.id)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                                        <ArrowLeft className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <span className="text-xs font-medium text-white">Grab First Frame</span>
                                    <span className="text-[10px] text-gray-500">Use as end frame</span>
                                </button>

                                <button
                                    onClick={() => onGrabLastFrame(shot.id)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-2 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <span className="text-xs font-medium text-white">Grab Last Frame</span>
                                    <span className="text-[10px] text-gray-500">Use as next start</span>
                                </button>
                            </div>

                            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
                                <p className="text-[10px] text-blue-300/80 leading-relaxed">
                                    <strong>Pro Tip:</strong> "Grab Last Frame" creates seamless transitions.
                                    Use it repeatedly to build long, consistent animations without cuts.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Camera Tab - 50+ Presets */}
                    {activeTab === "camera" && (
                        <motion.div
                            key="camera"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <CameraPresetSelector
                                selectedPreset={selectedCameraPreset}
                                onSelect={handleCameraPresetSelect}
                                genre={genre}
                                showGenreRecommendations={!!genre}
                                allowMixing={true}
                                selectedMixPresets={selectedMixPresets}
                                onMixSelect={handleMixedCameraSelect}
                            />

                            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10">
                                <p className="text-[10px] text-blue-300/80 leading-relaxed">
                                    <strong>Pro Tip:</strong> Use "Mix" mode to combine up to 3 camera movements
                                    for complex shots (e.g., Dolly In + Arc Left + Crane Up).
                                    {genre && (
                                        <span className="block mt-1">
                                            Green dots indicate moves recommended for your {genre.replace('_', ' ')} project.
                                        </span>
                                    )}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* V2V Edit Tab */}
                    {activeTab === "edit" && (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {/* Weather Changes */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Cloud className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Weather / Time of Day
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {WEATHER_PRESETS.map((weather) => (
                                        <button
                                            key={weather.id}
                                            onClick={() => handleWeatherChange(weather)}
                                            disabled={isProcessing}
                                            className={clsx(
                                                "flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors disabled:opacity-50",
                                                selectedWeather === weather.id
                                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                            )}
                                        >
                                            <weather.icon className="w-4 h-4" />
                                            <span className="text-[10px]">{weather.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Background Change */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Change Background
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={backgroundPrompt}
                                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                                        placeholder="e.g., frozen tundra, neon city, jungle..."
                                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                                    />
                                    <button
                                        onClick={handleBackgroundChange}
                                        disabled={isProcessing || !backgroundPrompt.trim()}
                                        className="px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* Custom V2V Prompt */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Wand2 className="w-3 h-3 text-gray-400" />
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        Custom Edit
                                    </span>
                                </div>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="Describe any edit... (e.g., 'change the car to a red Porsche', 'add falling leaves')"
                                    className="w-full h-16 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none"
                                />
                                <button
                                    onClick={() => {
                                        if (customPrompt.trim()) {
                                            onV2VEdit(shot.id, "custom", customPrompt);
                                            setCustomPrompt("");
                                        }
                                    }}
                                    disabled={isProcessing || !customPrompt.trim()}
                                    className="w-full mt-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                                >
                                    Apply V2V Edit
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Predict Next/Previous Tab */}
                    {activeTab === "predict" && (
                        <motion.div
                            key="predict"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="text-center space-y-2">
                                <p className="text-xs text-gray-400">
                                    Let AI predict what happens next or what came before this shot
                                </p>
                            </div>

                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Describe the next/previous scene... (e.g., 'the character turns around', 'close-up of their face')"
                                className="w-full h-20 bg-black/30 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 resize-none"
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => onPredictPreviousShot(shot.id, customPrompt)}
                                    disabled={isProcessing}
                                    className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-orange-400 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Previous Shot
                                </button>

                                <button
                                    onClick={() => onPredictNextShot(shot.id, customPrompt)}
                                    disabled={isProcessing}
                                    className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    Next Shot
                                </button>
                            </div>

                            <div className="bg-orange-500/5 rounded-lg p-3 border border-orange-500/10">
                                <p className="text-[10px] text-orange-300/80 leading-relaxed">
                                    <strong>Note:</strong> Next/Previous shot prediction works best with clear prompts.
                                    Reference elements with @Image1, @Image2 syntax for Kling O1.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

"use client";

import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Monitor, Smartphone, Square } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const SHOT_TYPES = [
    { id: "None", label: "None", image: "/icons/none.png" }, // Placeholders
    { id: "Extreme close up", label: "Extreme close up", image: "/icons/ecu.png" },
    { id: "Close up", label: "Close up", image: "/icons/cu.png" },
    { id: "Medium", label: "Medium", image: "/icons/med.png" },
    { id: "Wide", label: "Wide", image: "/icons/wide.png" },
    { id: "Extreme wide", label: "Extreme wide", image: "/icons/ew.png" },
];

const CAMERA_ANGLES = [
    { id: "None", label: "None" },
    { id: "Eye level", label: "Eye level" },
    { id: "Low angle", label: "Low angle" },
    { id: "Over the shoulder", label: "Over the shoulder" },
    { id: "Overhead", label: "Overhead" },
    { id: "Bird's eye view", label: "Bird's eye view" },
];

const RESOLUTIONS = [
    { id: "1080p", label: "1080p" },
    { id: "1440p", label: "1440p" },
    { id: "2048p", label: "2048p" },
];

const RATIOS = [
    { id: "16:9", label: "16:9", icon: Monitor },
    { id: "1:1", label: "1:1", icon: Square },
    { id: "9:16", label: "9:16", icon: Smartphone },
];

export function SettingsPanel() {
    const { generationSettings, updateSettings } = useAppStore();
    const [openSection, setOpenSection] = useState<string | null>("shot_type");

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="space-y-4">
            {/* Shot Type */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection("shot_type")}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                    <span className="font-medium">Shot Type</span>
                    <ChevronDown className={clsx("w-5 h-5 transition-transform", openSection === "shot_type" && "rotate-180")} />
                </button>
                <AnimatePresence>
                    {openSection === "shot_type" && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {SHOT_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => updateSettings({ shotType: type.id })}
                                        className={clsx(
                                            "flex flex-col items-center gap-2 p-2 rounded-lg transition-colors border",
                                            generationSettings.shotType === type.id
                                                ? "bg-blue-500/20 border-blue-500"
                                                : "bg-black/20 border-transparent hover:bg-white/5"
                                        )}
                                    >
                                        <div className="w-full aspect-square bg-white/10 rounded-md" /> {/* Placeholder for image */}
                                        <span className="text-xs text-center">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Camera Angle */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden">
                <button
                    onClick={() => toggleSection("camera_angle")}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                    <span className="font-medium">Camera Angle</span>
                    <ChevronDown className={clsx("w-5 h-5 transition-transform", openSection === "camera_angle" && "rotate-180")} />
                </button>
                <AnimatePresence>
                    {openSection === "camera_angle" && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 grid grid-cols-3 gap-2">
                                {CAMERA_ANGLES.map((angle) => (
                                    <button
                                        key={angle.id}
                                        onClick={() => updateSettings({ cameraAngle: angle.id })}
                                        className={clsx(
                                            "flex flex-col items-center gap-2 p-2 rounded-lg transition-colors border",
                                            generationSettings.cameraAngle === angle.id
                                                ? "bg-blue-500/20 border-blue-500"
                                                : "bg-black/20 border-transparent hover:bg-white/5"
                                        )}
                                    >
                                        <div className="w-full aspect-square bg-white/10 rounded-md" />
                                        <span className="text-xs text-center">{angle.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Location & Lighting (Text Inputs) */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 space-y-4">
                <div>
                    <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">Location</label>
                    <textarea
                        value={generationSettings.location}
                        onChange={(e) => updateSettings({ location: e.target.value })}
                        placeholder="Describe the location..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500/50 resize-none h-20"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">Lighting</label>
                    <textarea
                        value={generationSettings.lighting}
                        onChange={(e) => updateSettings({ lighting: e.target.value })}
                        placeholder="Describe the lighting..."
                        className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500/50 resize-none h-20"
                    />
                </div>
            </div>

            {/* Resolution & Ratio */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4 space-y-4">
                <div>
                    <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">Resolution</label>
                    <div className="flex gap-2">
                        {RESOLUTIONS.map(res => (
                            <button
                                key={res.id}
                                onClick={() => updateSettings({ resolution: res.id as any })}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                                    generationSettings.resolution === res.id
                                        ? "bg-white text-black border-white"
                                        : "bg-black/20 border-white/10 hover:bg-white/5"
                                )}
                            >
                                {res.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">Aspect Ratio</label>
                    <div className="flex gap-2">
                        {RATIOS.map(ratio => (
                            <button
                                key={ratio.id}
                                onClick={() => updateSettings({ aspectRatio: ratio.id as any })}
                                className={clsx(
                                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2",
                                    generationSettings.aspectRatio === ratio.id
                                        ? "bg-white text-black border-white"
                                        : "bg-black/20 border-white/10 hover:bg-white/5"
                                )}
                            >
                                <ratio.icon className="w-4 h-4" />
                                {ratio.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

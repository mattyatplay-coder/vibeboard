"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aperture, Camera, ChevronDown, Info, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";
import {
    LENS_PRESETS,
    LENS_EFFECTS,
    LensPreset,
    LensEffect,
    LENS_CATEGORY_COLORS,
    ANAMORPHIC_MODIFIERS,
    buildLensPrompt,
} from "@/data/LensPresets";

interface LensKitSelectorProps {
    selectedLens: LensPreset | null;
    selectedEffects: string[];
    isAnamorphic: boolean;
    onLensChange: (lens: LensPreset | null) => void;
    onEffectsChange: (effects: string[]) => void;
    onAnamorphicChange: (isAnamorphic: boolean) => void;
    onAspectRatioLock?: (aspectRatio: string) => void; // Called when anamorphic forces 2.39:1
    embedded?: boolean;
}

export function LensKitSelector({
    selectedLens,
    selectedEffects,
    isAnamorphic,
    onLensChange,
    onEffectsChange,
    onAnamorphicChange,
    onAspectRatioLock,
    embedded = false,
}: LensKitSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showInfo, setShowInfo] = useState<string | null>(null);

    const toggleEffect = (effectId: string) => {
        if (selectedEffects.includes(effectId)) {
            onEffectsChange(selectedEffects.filter((e) => e !== effectId));
        } else {
            onEffectsChange([...selectedEffects, effectId]);
        }
    };

    // Handle anamorphic toggle with aspect ratio lock
    const handleAnamorphicToggle = (value: boolean) => {
        onAnamorphicChange(value);
        if (value && onAspectRatioLock) {
            onAspectRatioLock('21:9'); // 2.39:1 cinematic widescreen
        }
    };

    // Compact button for toolbar
    if (!isOpen && !embedded) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={clsx(
                    "h-10 px-3 flex items-center gap-2 rounded-xl border transition-all hover:scale-105",
                    isAnamorphic
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : selectedLens
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                )}
                title="Lens Kit - Focal Length & Anamorphic"
            >
                <Aperture className="w-4 h-4" />
                <span className="text-xs font-medium">
                    {selectedLens ? selectedLens.focalLength : "Lens Kit"}
                </span>
                {isAnamorphic && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded-full">
                        ANAMORPHIC
                    </span>
                )}
                {selectedEffects.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/30 rounded-full">
                        +{selectedEffects.length}
                    </span>
                )}
            </button>
        );
    }

    const panelContent = (
        <div className={clsx(
            "flex flex-col h-full transition-colors duration-300",
            isAnamorphic && "bg-gradient-to-b from-blue-950/20 to-transparent"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Aperture className={clsx(
                        "w-5 h-5 transition-colors",
                        isAnamorphic ? "text-blue-400" : "text-cyan-400"
                    )} />
                    <h2 className="text-lg font-bold text-white">Lens Kit</h2>
                </div>
                {!embedded && (
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Glass Type Toggle - Spherical vs Anamorphic */}
            <div className="px-4 py-3 border-b border-white/10">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">GLASS TYPE</div>
                <div className="flex rounded-lg overflow-hidden border border-white/10">
                    <button
                        onClick={() => handleAnamorphicToggle(false)}
                        className={clsx(
                            "flex-1 py-2 px-3 text-xs font-medium transition-all",
                            !isAnamorphic
                                ? "bg-cyan-500/20 text-cyan-400 border-r border-cyan-500/30"
                                : "bg-white/5 text-gray-400 hover:bg-white/10 border-r border-white/10"
                        )}
                    >
                        Spherical
                    </button>
                    <button
                        onClick={() => handleAnamorphicToggle(true)}
                        className={clsx(
                            "flex-1 py-2 px-3 text-xs font-medium transition-all",
                            isAnamorphic
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                        )}
                    >
                        Anamorphic
                    </button>
                </div>
                {isAnamorphic && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-blue-400/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        2.39:1 cinematic widescreen • Oval bokeh • Blue streak flares
                    </div>
                )}
            </div>

            {/* Focal Length Slider Visual */}
            <div className="px-4 py-3 bg-black/30 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">FOCAL LENGTH</span>
                    <span className="text-sm font-mono text-cyan-400">
                        {selectedLens?.focalLength || "None"}
                    </span>
                </div>
                {/* Visual slider showing lens range */}
                <div className="relative h-8 bg-gradient-to-r from-red-500/20 via-green-500/20 to-blue-500/20 rounded-lg">
                    {LENS_PRESETS.map((lens) => {
                        const position = ((lens.focalMm - 14) / (135 - 14)) * 100;
                        return (
                            <button
                                key={lens.id}
                                onClick={() => onLensChange(selectedLens?.id === lens.id ? null : lens)}
                                className={clsx(
                                    "absolute top-1/2 -translate-y-1/2 w-3 h-6 rounded-sm transition-all hover:scale-125",
                                    selectedLens?.id === lens.id
                                        ? "bg-cyan-400 shadow-lg shadow-cyan-500/50"
                                        : "bg-white/40 hover:bg-white/70"
                                )}
                                style={{ left: `calc(${position}% - 6px)` }}
                                title={lens.name}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                    <span>14mm</span>
                    <span>50mm</span>
                    <span>135mm</span>
                </div>
            </div>

            {/* Lens Presets Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                    {LENS_PRESETS.map((lens) => (
                        <button
                            key={lens.id}
                            onClick={() => onLensChange(selectedLens?.id === lens.id ? null : lens)}
                            className={clsx(
                                "w-full text-left p-3 rounded-lg border transition-all",
                                selectedLens?.id === lens.id
                                    ? "bg-cyan-500/20 border-cyan-500/50"
                                    : "bg-white/5 border-white/10 hover:border-white/20"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">
                                            {lens.name}
                                        </span>
                                        <span
                                            className={clsx(
                                                "text-[10px] px-1.5 py-0.5 rounded border",
                                                LENS_CATEGORY_COLORS[lens.category]
                                            )}
                                        >
                                            {lens.category}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                                        {lens.description}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowInfo(showInfo === lens.id ? null : lens.id);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 transition-colors"
                                >
                                    <Info className="w-3.5 h-3.5 text-gray-500" />
                                </button>
                            </div>

                            {/* Expanded Info */}
                            <AnimatePresence>
                                {showInfo === lens.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                                            {/* Characteristics */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Distortion:</span>
                                                    <span className="text-gray-300">{lens.characteristics.distortion}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Compression:</span>
                                                    <span className="text-gray-300">{lens.characteristics.compression}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">DoF:</span>
                                                    <span className="text-gray-300">{lens.characteristics.depthOfField}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Perspective:</span>
                                                    <span className="text-gray-300">{lens.characteristics.perspective}</span>
                                                </div>
                                            </div>
                                            {/* Use Cases */}
                                            <div className="flex flex-wrap gap-1">
                                                {lens.useCases.map((use, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-gray-400"
                                                    >
                                                        {use}
                                                    </span>
                                                ))}
                                            </div>
                                            {/* Film Examples */}
                                            {lens.filmExamples && (
                                                <div className="text-[9px] text-gray-500 italic">
                                                    <Camera className="w-3 h-3 inline mr-1" />
                                                    {lens.filmExamples.join(" | ")}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    ))}
                </div>

                {/* Lens Effects Section */}
                <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Lens Effects
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {LENS_EFFECTS.map((effect) => (
                            <button
                                key={effect.id}
                                onClick={() => toggleEffect(effect.id)}
                                className={clsx(
                                    "p-2.5 rounded-lg border text-left transition-all",
                                    selectedEffects.includes(effect.id)
                                        ? "bg-purple-500/20 border-purple-500/50"
                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                )}
                            >
                                <span className="text-xs font-medium text-white block">
                                    {effect.name}
                                </span>
                                <span className="text-[10px] text-gray-500 line-clamp-1">
                                    {effect.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer - Active Modifiers Preview */}
            {(selectedLens || selectedEffects.length > 0 || isAnamorphic) && (
                <div className={clsx(
                    "p-3 border-t bg-black/30",
                    isAnamorphic ? "border-blue-500/20" : "border-white/10"
                )}>
                    <div className="text-[10px] text-gray-500 mb-1">WILL ADD TO PROMPT:</div>
                    <div className="flex flex-wrap gap-1">
                        {/* Anamorphic modifiers (shown first when active) */}
                        {isAnamorphic && ANAMORPHIC_MODIFIERS.slice(0, 3).map((mod, i) => (
                            <span
                                key={`anamorphic-${i}`}
                                className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded"
                            >
                                {mod}
                            </span>
                        ))}
                        {/* Lens modifiers */}
                        {selectedLens?.promptModifiers.slice(0, isAnamorphic ? 2 : 4).map((mod, i) => (
                            <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded"
                            >
                                {mod}
                            </span>
                        ))}
                        {/* Effect modifiers */}
                        {selectedEffects.flatMap((effectId) => {
                            const effect = LENS_EFFECTS.find((e) => e.id === effectId);
                            return effect?.promptModifiers.slice(0, 2).map((mod, i) => (
                                <span
                                    key={`${effectId}-${i}`}
                                    className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded"
                                >
                                    {mod}
                                </span>
                            ));
                        })}
                        {/* Overflow indicator */}
                        {((selectedLens?.promptModifiers.length || 0) + (isAnamorphic ? ANAMORPHIC_MODIFIERS.length : 0)) > 5 && (
                            <span className="text-[9px] text-gray-500">
                                +more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    if (embedded) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-[380px] h-[90vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
                {panelContent}
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-[420px] max-h-[85vh] bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {panelContent}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

// Compact inline selector for the toolbar
export function LensKitCompact({
    selectedLens,
    isAnamorphic,
    onLensChange,
    onAnamorphicChange,
}: {
    selectedLens: LensPreset | null;
    isAnamorphic: boolean;
    onLensChange: (lens: LensPreset | null) => void;
    onAnamorphicChange: (isAnamorphic: boolean) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "h-10 px-3 flex items-center gap-2 rounded-xl border transition-all hover:scale-105",
                    isAnamorphic
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                        : selectedLens
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                )}
            >
                <Aperture className="w-4 h-4" />
                <span className="text-xs font-medium">
                    {selectedLens ? selectedLens.focalLength : "Lens"}
                </span>
                {isAnamorphic && (
                    <span className="text-[9px] px-1 py-0.5 bg-blue-500/30 text-blue-300 rounded">
                        A
                    </span>
                )}
                <ChevronDown className={clsx("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={clsx(
                            "absolute top-full left-0 mt-2 w-64 border rounded-xl shadow-2xl z-50 overflow-hidden",
                            isAnamorphic ? "bg-[#0a1628] border-blue-500/20" : "bg-[#1a1a1a] border-white/10"
                        )}
                    >
                        {/* Anamorphic Toggle */}
                        <div className="p-2 border-b border-white/10">
                            <button
                                onClick={() => onAnamorphicChange(!isAnamorphic)}
                                className={clsx(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all",
                                    isAnamorphic
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                                )}
                            >
                                <span className="text-xs font-medium">Anamorphic Glass</span>
                                <div className={clsx(
                                    "w-8 h-4 rounded-full transition-colors relative",
                                    isAnamorphic ? "bg-blue-500" : "bg-gray-600"
                                )}>
                                    <div className={clsx(
                                        "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                                        isAnamorphic ? "translate-x-4" : "translate-x-0.5"
                                    )} />
                                </div>
                            </button>
                            {isAnamorphic && (
                                <p className="text-[9px] text-blue-400/70 px-3 mt-1">
                                    2.39:1 • Oval bokeh • Blue flares
                                </p>
                            )}
                        </div>

                        <div className="p-2 max-h-64 overflow-y-auto">
                            {/* Clear Selection */}
                            <button
                                onClick={() => {
                                    onLensChange(null);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                No lens selected
                            </button>
                            {/* Lens Options */}
                            {LENS_PRESETS.map((lens) => (
                                <button
                                    key={lens.id}
                                    onClick={() => {
                                        onLensChange(lens);
                                        setIsOpen(false);
                                    }}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg transition-colors",
                                        selectedLens?.id === lens.id
                                            ? isAnamorphic ? "bg-blue-500/20 text-blue-300" : "bg-cyan-500/20 text-cyan-300"
                                            : "text-white hover:bg-white/5"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium">{lens.name}</span>
                                        <span
                                            className={clsx(
                                                "text-[9px] px-1 py-0.5 rounded",
                                                LENS_CATEGORY_COLORS[lens.category]
                                            )}
                                        >
                                            {lens.category}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                                        {lens.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

"use client";

import { useState, useRef } from "react";
import { Upload, Sparkles, ImageIcon, X, ChevronDown, Wand2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useDropzone } from "react-dropzone";

interface FoundationImagePanelProps {
    projectId: string;
    foundationImage: string | null;
    onFoundationImageChange: (image: string | File | null) => void;
    onGenerateFromPrompt: (prompt: string) => void;
    styleConfig?: {
        aesthetic?: string;
        lighting?: string;
        colorPalette?: string;
        cameraDirection?: string;
    };
    onStyleConfigChange?: (config: any) => void;
}

// Timeline Prompting structure from Mira AI video
const TIMELINE_COMPONENTS = {
    aesthetic: [
        "Pixar animation style",
        "Cinematic film look",
        "Anime style",
        "Realistic photography",
        "Film noir",
        "Vintage 1970s",
        "Cyberpunk",
        "Studio Ghibli inspired",
        "Sci-fi futuristic",
        "Fantasy epic",
        "Documentary style",
        "Music video aesthetic"
    ],
    lighting: [
        "Dramatic warm and cold contrast",
        "Golden hour",
        "Neon lights",
        "Natural daylight",
        "Moody low-key",
        "High-key bright",
        "Rim lighting",
        "Volumetric fog",
        "Sunset silhouette",
        "Studio lighting",
        "Candlelight",
        "Moonlight"
    ],
    colorPalette: [
        "Warm oranges and teals",
        "Muted earth tones",
        "Vibrant saturated",
        "Desaturated cinematic",
        "Pastel soft",
        "High contrast B&W",
        "Neon pink and blue",
        "Sepia vintage",
        "Cool blue undertones",
        "Autumnal reds and browns"
    ],
    cameraDirection: [
        "Slow dolly forward",
        "Static establishing shot",
        "Handheld following",
        "Crane shot upward",
        "Tracking side shot",
        "Push in dramatic",
        "Pull back reveal",
        "Pan left to right",
        "Orbit around subject",
        "Steadicam smooth"
    ]
};

export function FoundationImagePanel({
    projectId,
    foundationImage,
    onFoundationImageChange,
    onGenerateFromPrompt,
    styleConfig = {},
    onStyleConfigChange
}: FoundationImagePanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [generationPrompt, setGenerationPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (files) => {
            if (files.length > 0) {
                onFoundationImageChange(files[0]);
            }
        },
        accept: { 'image/*': [] },
        maxFiles: 1
    });

    // Build Timeline Prompt from components
    const buildTimelinePrompt = () => {
        const parts = [];
        if (styleConfig.aesthetic) parts.push(styleConfig.aesthetic);
        if (styleConfig.lighting) parts.push(styleConfig.lighting);
        if (styleConfig.colorPalette) parts.push(styleConfig.colorPalette);
        if (styleConfig.cameraDirection) parts.push(styleConfig.cameraDirection);
        return parts.join(", ");
    };

    const handleCopyPrompt = () => {
        const prompt = buildTimelinePrompt();
        if (prompt) {
            navigator.clipboard.writeText(prompt);
            setCopiedPrompt(true);
            setTimeout(() => setCopiedPrompt(false), 2000);
        }
    };

    const handleGenerate = async () => {
        if (!generationPrompt.trim()) return;
        setIsGenerating(true);
        try {
            // Combine user prompt with Timeline Prompt structure
            const timelineAddition = buildTimelinePrompt();
            const fullPrompt = timelineAddition
                ? `${generationPrompt}. ${timelineAddition}`
                : generationPrompt;
            await onGenerateFromPrompt(fullPrompt);
        } finally {
            setIsGenerating(false);
        }
    };

    const updateStyleConfig = (key: string, value: string) => {
        onStyleConfigChange?.({
            ...styleConfig,
            [key]: value
        });
        setActiveDropdown(null);
    };

    const previewUrl = foundationImage
        ? (typeof foundationImage === 'string' ? foundationImage : URL.createObjectURL(foundationImage as any))
        : null;

    return (
        <div className="bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold text-white">Foundation Image</h3>
                        <p className="text-[10px] text-gray-500">Master aesthetic reference for all scenes</p>
                    </div>
                </div>
                <ChevronDown className={clsx(
                    "w-4 h-4 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Foundation Image Upload/Preview */}
                            <div className="flex gap-4">
                                {/* Image Area */}
                                <div
                                    {...getRootProps()}
                                    className={clsx(
                                        "relative w-40 aspect-video rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden",
                                        isDragActive ? "border-purple-500 bg-purple-500/10" : "border-white/20 hover:border-purple-500/50",
                                        previewUrl && "border-solid border-purple-500/30"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    {previewUrl ? (
                                        <>
                                            <img
                                                src={previewUrl}
                                                alt="Foundation"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <Upload className="w-5 h-5 text-white" />
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onFoundationImageChange(null);
                                                }}
                                                className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-500 rounded text-white transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                                            <Upload className="w-6 h-6 mb-1" />
                                            <span className="text-[10px]">Drop or click</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Generate */}
                                <div className="flex-1 space-y-2">
                                    <textarea
                                        value={generationPrompt}
                                        onChange={(e) => setGenerationPrompt(e.target.value)}
                                        placeholder="Describe your foundation aesthetic... (e.g., 'Space knight in weathered armor, cinematic sci-fi')"
                                        className="w-full h-16 bg-black/30 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                                    />
                                    <button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !generationPrompt.trim()}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors border border-purple-500/20"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {isGenerating ? "Generating..." : "Generate Foundation"}
                                    </button>
                                </div>
                            </div>

                            {/* Timeline Prompting Structure */}
                            <div className="border-t border-white/5 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Wand2 className="w-3 h-3 text-purple-400" />
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                            Timeline Prompt Structure
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-purple-400 transition-colors"
                                    >
                                        {copiedPrompt ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedPrompt ? "Copied!" : "Copy"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(TIMELINE_COMPONENTS).map(([key, options]) => (
                                        <div key={key} className="relative">
                                            <button
                                                onClick={() => setActiveDropdown(activeDropdown === key ? null : key)}
                                                className={clsx(
                                                    "w-full flex items-center justify-between px-2 py-1.5 bg-white/5 hover:bg-white/10 border rounded text-xs transition-colors",
                                                    (styleConfig as any)[key]
                                                        ? "border-purple-500/30 text-purple-300"
                                                        : "border-white/10 text-gray-400"
                                                )}
                                            >
                                                <span className="truncate">
                                                    {(styleConfig as any)[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <ChevronDown className="w-3 h-3 flex-shrink-0 ml-1" />
                                            </button>

                                            <AnimatePresence>
                                                {activeDropdown === key && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -5 }}
                                                        className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto"
                                                    >
                                                        <button
                                                            onClick={() => updateStyleConfig(key, "")}
                                                            className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:bg-white/5 transition-colors"
                                                        >
                                                            Clear
                                                        </button>
                                                        {options.map((option) => (
                                                            <button
                                                                key={option}
                                                                onClick={() => updateStyleConfig(key, option)}
                                                                className={clsx(
                                                                    "w-full text-left px-2 py-1.5 text-xs transition-colors",
                                                                    (styleConfig as any)[key] === option
                                                                        ? "bg-purple-500/20 text-purple-300"
                                                                        : "text-gray-300 hover:bg-white/5"
                                                                )}
                                                            >
                                                                {option}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview of built prompt */}
                                {buildTimelinePrompt() && (
                                    <div className="mt-3 p-2 bg-black/30 rounded border border-purple-500/10">
                                        <p className="text-[10px] text-purple-300/70 leading-relaxed">
                                            {buildTimelinePrompt()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Usage Tip */}
                            <div className="bg-purple-500/5 rounded-lg p-3 border border-purple-500/10">
                                <p className="text-[10px] text-purple-300/80 leading-relaxed">
                                    <strong>Tip:</strong> Your foundation image sets the visual DNA for your entire project.
                                    All scene images will reference this aesthetic. Use the Timeline Prompt structure
                                    (Aesthetic + Lighting + Color + Camera) for consistent results.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
